"""
baseline.py
Seasonal and trend time-series baselines for Charter-IQ.
Provides SeasonalTrendBaseline which mirrors Prophet's fit/predict interface.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge


class SeasonalTrendBaseline:
    """
    Robust time-series trend + Fourier annual harmonics baseline.
    Mirrors Prophet's fit(df) and predict(df) interfaces seamlessly.
    """
    def __init__(self, **kwargs):
        self.regressors = []
        self.model = Ridge(alpha=1.0)
        self.anchor_date = None

    def add_regressor(self, name: str):
        self.regressors.append(name)

    def _build_features(self, df: pd.DataFrame) -> np.ndarray:
        t = (pd.to_datetime(df["ds"]) - self.anchor_date).dt.days.values.astype(float)
        sin_ann = np.sin(2 * np.pi * t / 365.25)
        cos_ann = np.cos(2 * np.pi * t / 365.25)
        sin_semi = np.sin(4 * np.pi * t / 365.25)
        cos_semi = np.cos(4 * np.pi * t / 365.25)
        feats = [t / 365.25, sin_ann, cos_ann, sin_semi, cos_semi]
        for reg in self.regressors:
            if reg in df.columns:
                feats.append(df[reg].values.astype(float))
            else:
                feats.append(np.zeros(len(df)))
        return np.column_stack(feats)

    def fit(self, df: pd.DataFrame):
        self.anchor_date = pd.to_datetime(df["ds"]).min()
        X = self._build_features(df)
        y = df["y"].values
        self.model.fit(X, y)
        return self

    def predict(self, future_df: pd.DataFrame) -> pd.DataFrame:
        X = self._build_features(future_df)
        yhat = self.model.predict(X)
        res = future_df.copy()
        res["yhat"] = yhat
        res["yhat_lower"] = yhat - 1.5
        res["yhat_upper"] = yhat + 1.5
        return res
