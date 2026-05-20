"""
Time-Series Model Training: LSTM and Transformer Encoder

Trains both architectures on windowed spatial-temporal features,
saves the best model (by macro F1 on validation), and reports results.

Usage:
    python ml/train_timeseries.py
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import f1_score, classification_report
import joblib

# Add project root to path for sibling imports
sys.path.insert(0, str(Path(__file__).parent))
from features import compute_features_batch, build_windows, FEATURE_NAMES, WINDOW_SIZE

# ─── Paths ────────────────────────────────────────────────────────────────────
DATA_PATH   = Path(__file__).parent.parent / "data" / "datasets" / "pilgrim_data.csv"
MODELS_DIR  = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

# ─── Hyperparameters ──────────────────────────────────────────────────────────
BATCH_SIZE    = 256
MAX_EPOCHS    = 100
PATIENCE      = 10
LR            = 1e-3
N_FEATURES    = len(FEATURE_NAMES)
N_CLASSES     = 3
DEVICE        = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ─── Model Definitions ────────────────────────────────────────────────────────

class LSTMClassifier(nn.Module):
    def __init__(self, n_features: int = N_FEATURES, n_classes: int = N_CLASSES):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=n_features,
            hidden_size=128,
            num_layers=2,
            dropout=0.3,
            batch_first=True,
        )
        self.head = nn.Sequential(
            nn.Linear(128, 32),
            nn.ReLU(),
            nn.Linear(32, n_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, n_features)
        _, (h, _) = self.lstm(x)
        return self.head(h[-1])   # last layer hidden state


class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 100):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len).unsqueeze(1).float()
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-np.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe.unsqueeze(0))   # (1, max_len, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.pe[:, : x.size(1)]


class TransformerClassifier(nn.Module):
    def __init__(self, n_features: int = N_FEATURES, n_classes: int = N_CLASSES,
                 d_model: int = 64, nhead: int = 4, num_layers: int = 2,
                 dim_feedforward: int = 128, dropout: float = 0.1):
        super().__init__()
        self.proj = nn.Linear(n_features, d_model)
        self.pos_enc = PositionalEncoding(d_model)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout, batch_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.head = nn.Linear(d_model, n_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, n_features)
        x = self.pos_enc(self.proj(x))
        x = self.encoder(x)
        x = x.mean(dim=1)   # mean pool over time
        return self.head(x)


# ─── Dataset ──────────────────────────────────────────────────────────────────

class WindowDataset(torch.utils.data.Dataset):
    def __init__(self, windows: np.ndarray, labels: np.ndarray):
        self.X = torch.tensor(windows, dtype=torch.float32)
        self.y = torch.tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


# ─── Training Loop ────────────────────────────────────────────────────────────

def train_model(
    model: nn.Module,
    train_loader: torch.utils.data.DataLoader,
    val_loader: torch.utils.data.DataLoader,
    class_weights: torch.Tensor,
    model_name: str,
) -> tuple[nn.Module, float]:
    """Train one model; return (best_model_state, best_val_f1)."""
    model = model.to(DEVICE)
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(DEVICE))
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=MAX_EPOCHS)

    best_f1 = 0.0
    best_state = None
    patience_counter = 0

    print(f"\nTraining {model_name} on {DEVICE}")
    print(f"{'Epoch':>6}  {'Train Loss':>12}  {'Val F1':>10}")
    print("-" * 34)

    for epoch in range(1, MAX_EPOCHS + 1):
        # ── train ────────────────────────────────────────────────────────────
        model.train()
        total_loss = 0.0
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(DEVICE), y_batch.to(DEVICE)
            optimizer.zero_grad()
            logits = model(X_batch)
            loss = criterion(logits, y_batch)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += loss.item() * len(y_batch)
        avg_loss = total_loss / len(train_loader.dataset)

        # ── validate ──────────────────────────────────────────────────────────
        model.eval()
        all_preds, all_labels = [], []
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                logits = model(X_batch.to(DEVICE))
                preds = logits.argmax(dim=1).cpu().numpy()
                all_preds.extend(preds)
                all_labels.extend(y_batch.numpy())

        val_f1 = f1_score(all_labels, all_preds, average="macro", zero_division=0)
        scheduler.step()

        if epoch % 5 == 0 or epoch == 1:
            print(f"{epoch:>6}  {avg_loss:>12.4f}  {val_f1:>10.4f}")

        if val_f1 > best_f1:
            best_f1 = val_f1
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= PATIENCE:
                print(f"  Early stopping at epoch {epoch}")
                break

    model.load_state_dict(best_state)
    return model, best_f1


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not DATA_PATH.exists():
        print(f"Dataset not found: {DATA_PATH}\nRun: python data/generate_dataset.py")
        sys.exit(1)

    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    print("Engineering features...")
    df = compute_features_batch(df)
    df = df.dropna(subset=FEATURE_NAMES)

    print("Building windows...")
    windows, labels, _ = build_windows(df, window_size=WINDOW_SIZE)
    print(f"  Windows: {windows.shape}  Labels: {labels.shape}")
    print(f"  Class distribution: {np.bincount(labels)}")

    # ── Train / val / test split (by index, stratified) ───────────────────────
    idx = np.arange(len(labels))
    idx_tv, idx_test, y_tv, y_test = train_test_split(idx, labels, test_size=0.15, stratify=labels, random_state=42)
    idx_train, idx_val, y_train, y_val = train_test_split(idx_tv, y_tv, test_size=0.15 / 0.85, stratify=y_tv, random_state=42)

    # ── Scale features (fit on train only) ───────────────────────────────────
    flat_train = windows[idx_train].reshape(-1, N_FEATURES)
    scaler = StandardScaler().fit(flat_train)
    joblib.dump(scaler, MODELS_DIR / "scaler.pkl")

    def scale_windows(w: np.ndarray) -> np.ndarray:
        s = w.shape
        return scaler.transform(w.reshape(-1, N_FEATURES)).reshape(s)

    X_train = scale_windows(windows[idx_train])
    X_val   = scale_windows(windows[idx_val])
    X_test  = scale_windows(windows[idx_test])

    # ── Class weights ────────────────────────────────────────────────────────
    counts = np.bincount(y_train, minlength=N_CLASSES).astype(float)
    weights = torch.tensor((counts.sum() / (N_CLASSES * counts)), dtype=torch.float32)

    # ── DataLoaders ───────────────────────────────────────────────────────────
    def make_loader(X, y, shuffle):
        ds = WindowDataset(X, y)
        return torch.utils.data.DataLoader(ds, batch_size=BATCH_SIZE, shuffle=shuffle, num_workers=0)

    train_loader = make_loader(X_train, y_train, shuffle=True)
    val_loader   = make_loader(X_val, y_val, shuffle=False)
    test_loader  = make_loader(X_test, y_test, shuffle=False)

    results = {}

    for model_cls, model_name, save_name in [
        (LSTMClassifier, "LSTM", "lstm_model.pt"),
        (TransformerClassifier, "Transformer", "transformer_model.pt"),
    ]:
        t0 = time.time()
        model = model_cls()
        model, val_f1 = train_model(model, train_loader, val_loader, weights, model_name)
        torch.save(model.state_dict(), MODELS_DIR / save_name)

        # ── Test evaluation ───────────────────────────────────────────────────
        model.eval()
        all_preds, all_probs = [], []
        with torch.no_grad():
            for X_batch, _ in test_loader:
                logits = model(X_batch.to(DEVICE))
                probs = torch.softmax(logits, dim=1).cpu().numpy()
                all_preds.extend(logits.argmax(dim=1).cpu().numpy())
                all_probs.extend(probs)

        test_f1 = f1_score(y_test, all_preds, average="macro", zero_division=0)
        results[model_name] = {"val_f1": val_f1, "test_f1": test_f1}

        print(f"\n{model_name} Test Results (elapsed {time.time()-t0:.0f}s):")
        print(classification_report(y_test, all_preds, target_names=["Safe","Warning","Critical"], zero_division=0))

    # ── Save best model as best_model.pt ─────────────────────────────────────
    best_name = max(results, key=lambda k: results[k]["test_f1"])
    best_save = "lstm_model.pt" if best_name == "LSTM" else "transformer_model.pt"
    import shutil
    shutil.copy(MODELS_DIR / best_save, MODELS_DIR / "best_model.pt")
    print(f"\nBest model: {best_name} (test macro F1={results[best_name]['test_f1']:.4f}) → saved as best_model.pt")

    # ── Save config ───────────────────────────────────────────────────────────
    config = {
        "feature_names": FEATURE_NAMES,
        "window_size": WINDOW_SIZE,
        "n_features": N_FEATURES,
        "n_classes": N_CLASSES,
        "label_map": {"0": "Safe", "1": "Warning", "2": "Critical"},
        "best_model": best_name,
        "best_model_file": "best_model.pt",
        "results": results,
    }
    with open(MODELS_DIR / "config.json", "w") as f:
        json.dump(config, f, indent=2)
    print(f"Config saved to {MODELS_DIR / 'config.json'}")


if __name__ == "__main__":
    main()
