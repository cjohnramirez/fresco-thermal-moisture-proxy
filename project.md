# Fresco Greenovations: Technical Feasibility of Thermal Proxies for Soil Moisture Sensing

**Feasibility Analysis: Utilizing Substrate Temperature as a Proxy for Volumetric Water Content (VWC)**

> **Executive Summary:** Replacing high-fidelity capacitance sensors (₱1,300/unit) with inexpensive thermistor arrays (₱100/unit) could enable high-resolution moisture monitoring across large-scale deployments (~4,200 units/greenhouse) at a fraction of the cost. This analysis evaluates whether the thermophysical properties of the substrate can reliably model moisture levels.
> 
> *Fresco Greenovations, Inc. · Evidence-Based Agronomic Review*

---

## 1. Operational Observations and Sensor Constraints

| Parameter | Field Observation & Technical Implication |
| :--- | :--- |
| **Sensor Variance** | High variance observed among low-cost capacitive probes (7 distinct readings from 7 identical sensors). These lack the reliability required for automated fertigation. |
| **Cost Constraints** | The reliable reference sensor (ECOWITT WH51) is prohibitively expensive to scale across ~4,200 grow bags per greenhouse. |
| **Spatial Heterogeneity** | Substrates exhibit significant moisture stratification (e.g., saturated surface, dry subsurface). Single-point sensing is inadequate for accurate volume estimation. |

**Problem Statement:** Is there a cost-effective, robust methodology to continuously monitor substrate moisture profiles? Given that DS18B20 temperature probes are already integrated into the grow bags, we investigate the viability of utilizing thermal data as a proxy for moisture content.

---

## 2. Hypothesis: Thermophysical Modeling of Substrate Moisture

* **Vertical Profiling:** Deploying a 3-probe array (surface, root-zone, substrate base) to capture the thermal gradient.
* **Thermodynamic Principle:** Volumetric water content directly correlates with thermal inertia. A substrate with higher moisture content possesses a greater specific heat capacity, thereby dampening diurnal temperature oscillations (slower heating and cooling rates).
* **Irrigation as a Thermal Perturbation:** Each irrigation event introduces a measurable thermal pulse. The relaxation time—the rate at which the substrate returns to thermal equilibrium—theoretically encodes the moisture content.
* **Proposed Model:** Log temporal temperature data alongside ECOWITT reference sensors to develop a regression model, aiming to substitute ₱1,300 capacitive sensors with a ₱300 thermistor array.

> 💧 *Sensing Array: Surface · Root-Zone · Base*

---

## 3. Theoretical Viability: The Physics of Thermal Inertia

* **Soil Physics Foundations:** The volumetric heat capacity and thermal conductivity of a medium are highly dependent on its water content. Increased moisture yields higher thermal inertia, resulting in a damped and lagged temperature response.
* **Industry Precedents:** Existing agricultural technologies, such as dual-probe heat-pulse sensors, and remote sensing methodologies (e.g., satellite thermal-inertia mapping) successfully recover water content utilizing this exact physical relationship.
* **Conclusion on Viability:** The differential temperature response between wet and dry states is a genuine, measurable signal. The critical challenge lies in isolating this signal using passive temperature probes.

> *Dry Substrate → High Amplitude Diurnal Swing · Saturated Substrate → Damped Diurnal Swing*

---

## 4. Methodological Limitations: Challenges of Passive Sensing ⚠

* **Underdetermined System:** A specific temperature reading can result from multiple environmental states (e.g., a wet bag on a cool, cloudy day vs. a dry bag at night). The mapping of temperature to moisture is non-unique (many-to-one).
* **Confounding Variables:** The subtle moisture signal is heavily obscured by external factors such as direct solar radiation on the bag, ambient greenhouse air temperature fluctuations, and the temperature of the irrigation water itself.
* **Resolution Constraints:** The DS18B20 sensor possesses an accuracy of ±0.5 °C. Given the observed discrepancies in baseline sensor tests, relying on slight thermal differentials introduces high margins of error.
* **Active vs. Passive Mechanics:** Established thermal moisture sensors utilize an *active* methodology (injecting a calibrated heat pulse). Passive sensing requires highly stable environmental conditions (e.g., clear, windless nights) that do not align with continuous greenhouse operations.

**Strategic Recommendation:** The thermal proxy model must be rigorously validated against the ECOWITT reference sensor. The ECOWITT should remain the definitive ground truth. A passive thermal model cannot be strictly relied upon without accounting for dynamic environmental variables.

---

## 5. Validated Applications for Substrate Thermal Data ✓

While thermal data may struggle as a standalone moisture proxy, it remains highly valuable for other agronomic metrics:

### A. Irrigation Event Verification
Each fertigation event leaves a distinct thermal signature. The temperature probes serve as a highly reliable, low-cost network to verify if water was successfully delivered across the entire greenhouse.

### B. Thermal Stress and Phenological Tracking
Direct measurement of root-zone temperatures allows for precise tracking of thermal stress, cold shocks, and accumulation of growing degree days (GDD), which directly impact crop physiology.

### C. The Relaxation Rate Methodology
By treating the applied irrigation water as a "free heat pulse," the rate at which the substrate temperature normalizes can be analyzed. This relaxation speed correlates with saturation levels, functioning as an inexpensive heat-pulse sensor alternative that merits further empirical testing.

---

## 6. Alternative Instrumentation: Gravimetric Lysimetry

*A high-fidelity methodology for direct water volume measurement.*

* **Direct Volume Measurement:** Mass correlates directly with water volume. Utilizing a load cell (mini-lysimeter) beneath the grow bag provides a direct, unconfounded measurement of water content, bypassing thermal estimation errors.
* **Transpiration and Evaporation Rates:** The negative slope of the mass over time precisely dictates the plant's actual water consumption (evapotranspiration) between irrigation events.
* **Irrigation Precision:** Gravimetric tracking reveals the exact volume of water retained per plant per irrigation event—a critical metric currently untracked.
* **Hardware Requirements:** Requires sourcing robust, temperature-compensated, drift-resistant real-time load cells for continuous greenhouse deployment.

> *Gravimetric Data: Mass Step Increase = Irrigation Event · Negative Mass Slope = Plant Water Consumption*

---

## 7. Conclusions and Experimental Design

| Objective | Verdict & Action Plan |
| :--- | :--- |
| **Temperature → Moisture Proxy** | **Validate, do not deploy standalone.** Relies on valid physics but is highly confounded by passive variables. Maintain ECOWITT as ground truth. |
| **Temperature → Plant Growth** | **Monitor directly.** Canopy development is better assessed via light interception sensors, not inferred from substrate thermals. |
| **Moisture → Root Water Uptake** | **Implement Load Cells.** Uptake is a volumetric flow rate; a passive thermometer cannot quantify it. Weigh the substrate. |

**The Definitive Validation Experiment:**
Instrument a single test bag with: DS18B20 array + ECOWITT + Load Cell + Ambient Air Temperature + Incident Light Sensor. Monitor this setup across multiple wet–dry cycles and varying weather conditions. If an out-of-sample prediction model utilizing thermal data holds up against the gravimetric (load cell) ground truth, the thermal proxy can be scaled. Otherwise, the load cell proves to be the necessary hardware for accurate agronomy.

---

## 8. Proposed Protocol: 7-Day Gravimetric and Thermal Baseline Study

*Objective: Empirical determination of daily irrigation requirements.*

This protocol outlines a one-week baseline study on a single bell-pepper grow bag within the greenhouse environment. To accurately model the thermal and gravimetric dynamics, the system must be tested with an actively transpiring plant, as a bare substrate will not exhibit realistic water consumption.

> 📆 Frequency: Once daily · 🕛 Time: 12:00 NN · 💧 Volume: 2 L (≈ 2 kg) · ⏱ Protocol: Irrigate → Wait 1 hr → Weigh

### 8.1 Diurnal Experimental Loop

* **Standardized Irrigation:** Apply exactly 2 L of water once daily at 12:00 NN. The volume is measured gravimetrically to ensure balance closure.
* **Data Logging:** Record timestamp, volume applied, pre-irrigation mass (the daily minimum), and immediate post-irrigation mass.
* **Container Capacity Baseline (+1 Hr):** A timer is initiated post-irrigation. After exactly 1 hour, the drained bag is weighed to establish the standardized container capacity baseline.
* **Continuous Telemetry:** The DS18B20 array (surface, root, bottom) logs continuously, alongside greenhouse ambient air temperature and irrigation water temperature, isolating the thermal pulse from ambient shifts.

### 8.2 Expected Analytical Outputs

* **Evapotranspiration Rate:** The mass reduction between consecutive pre-irrigation weigh-ins dictates the daily plant water consumption, correlated with the daily thermal amplitude swing.
* **Thermal Irrigation Fingerprint:** Characterizing the temperature drop associated with the 2 kg mass increase, and calculating the thermal relaxation rate.
* **Irrigation Requirement Diagnostics:**
    * **Downward Baseline Drift (Deficit):** If pre-irrigation mass decreases day-over-day, 2 L is insufficient.
    * **Upward Baseline Drift (Oversaturation):** If pre-irrigation mass increases, the substrate is waterlogged; volume must be reduced.
    * **Stable Baseline:** 2 L precisely matches the daily crop demand.

### 8.3 Scope and Next Steps

* **Current Scope:** This initial phase (n=1, manual scale, no forced dry-down) characterizes baseline physiological responses and validates the data pipeline. It does *not* immediately establish a robust temperature-to-moisture model. ECOWITT remains the ground truth.
* **Phase 2:** Automate gravimetric data collection via load cells, introduce controlled dry-down stress periods, and increase the sample size for statistical significance.

---
**References & Literature Review:**
*Fresco Evidence Review Repository (`grow-bag-thermal-sensing-evidence.md`)*
* Jackson et al., 1981 (Crop Water Stress Index - CWSI)
* Basinger et al., 2003 (Dual-probe heat-pulse methodologies)
* *Journal of Hydrometeorology*, 2012 (Thermal-inertia soil moisture mapping)
* Granier, 2021 (Sap-flow thermal dissipation calibration)