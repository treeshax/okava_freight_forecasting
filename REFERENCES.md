# References — Charter-IQ Freight Forecasting & Decision Support

This document lists the core domain research papers and theoretical foundations implemented in the **Charter-IQ** system modules.

---

## 1. Primary Citations

### 1.1 SHAP Explainability & Driver Identification
* **Paper**: Kim, Y., Kim, H., & Choi, J. (2025). *"Baltic dry index forecast using financial market data: ML methods and SHAP explanations."* PLOS ONE.
* **Application**: Drives the SHAP feature attribution computation and visualization in `/forecasting` and `AnalyticsPortal.jsx` to answer "why" rate forecasts change.

### 1.2 RL-as-Verification Architecture
* **Paper**: Guo, L., Kuang, H., Sui, Y., & Wang, J. (2025). *"On predicting ocean freight rates: a hybrid model of combined error evaluation and reinforcement learning."* Maritime Economics & Logistics.
* **Application**: Precedent for the reinforcement learning structure where the RL layer acts strictly to verify, calibrate, and optimize the outputs of the supervised machine learning forecasters (adjusting weights and confidence bands) rather than directly acting in the market. Implemented in `/rl_verifier`.

### 1.3 Baseline Models & Review
* **Paper**: Tsolaki, M. et al. (2023). *"Utilizing machine learning on freight transportation and logistics: a review."* ICT Express.
* **Application**: General ML-in-logistics data preprocessing, feature engineering best practices, and pipeline design guidelines.

### 1.4 Primary Forecasting Ensemble Choice
* **Paper**: *"Enhancing Road Freight Price Forecasting Using Gradient Boosting Ensemble ML."* Mathematics (MDPI), 2025.
* **Application**: Justifies the selection of LightGBM/XGBoost over deep networks as the primary forecasting engine due to superior performance on tabular/structured logistics data with high route-level heterogeneity.

---

## 2. Phase-2 Upgrade Path (Comment References)

### 2.1 Deep Learning Sequence Modeling
* **Paper**: Su, M., Park, S., & Bae, K. (2024). *"CNN-BiLSTM-Attention ensemble for BDI forecasting."* Maritime Economics & Logistics.
* **Application**: Cited in code comments as the primary research foundation for the Phase-2 deep net ensemble upgrade.
