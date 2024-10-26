function calculateTax() {
    // Get user inputs
    const cif = parseFloat(document.getElementById("cif").value);
    const engineSize = parseInt(document.getElementById("engineSize").value);
    const fuelType = document.getElementById("fuelType").value;
    const age = document.getElementById("age").value;

    if (isNaN(cif) || isNaN(engineSize)) {
        document.getElementById("result").innerText = "Please enter valid numbers for CIF and Engine Size.";
        return;
    }

    let duty = 0;
    let excise = 0;
    let vat = 0;
    let totalTax = 0;

    // Conditions for Vehicles 4 Years or Older
    if (age === "over4") {
        if (fuelType === "gasoline") {
            if (engineSize > 1500 && engineSize <= 1800) {
                excise = (cif + 6000) * 0.3 + 6000;
            } else if (engineSize > 1800 && engineSize <= 2000) {
                excise = (cif + 6500) * 0.3 + 6500;
            } else if (engineSize > 2000 && engineSize <= 3000) {
                excise = (cif + 13500) * 0.7 + 13500;
            } else if (engineSize > 3000) {
                excise = (cif + 14500) * 1.0 + 14500;
            }
            // Over 4 years, VAT is 0% in this case
        } else if (fuelType === "diesel") {
            if (engineSize > 1500 && engineSize <= 2000) {
                excise = (cif + 15400) * 0.3 + 15400;
            } else if (engineSize > 2000 && engineSize <= 2500) {
                excise = (cif + 15400) * 0.7 + 15400;
            } else if (engineSize > 2500 && engineSize <= 3000) {
                excise = (cif + 15500) * 0.7 + 15500;
            } else if (engineSize > 3000) {
                excise = (cif + 17200) * 1.0 + 17200;
            }
            // Over 4 years, VAT is 0% in this case
        }
        totalTax = excise;
    } 
    // Conditions for Vehicles Under 4 Years Old
    else if (age === "under4") {
        if (fuelType === "gasoline") {
            if (engineSize <= 1000) {
                duty = cif * 0.35;
                excise = 0;
            } else if (engineSize > 1000 && engineSize <= 1500) {
                duty = cif * 0.35;
                excise = 0;
            } else if (engineSize > 1500 && engineSize <= 1800) {
                duty = cif * 0.45;
                excise = 0.1 * (duty + cif);
            } else if (engineSize > 2000 && engineSize <= 3000) {
                duty = cif * 0.45;
                excise = 1.1 * (duty + cif);
            } else if (engineSize > 3000) {
                duty = cif * 0.45;
                excise = 1.4 * (duty + cif);
            }
        } else if (fuelType === "diesel") {
            if (engineSize <= 1500) {
                duty = cif * 0.35;
                excise = 0;
            } else if (engineSize > 1500 && engineSize <= 1800) {
                duty = cif * 0.45;
                excise = 0.1 * (duty + cif);
            } else if (engineSize > 2000 && engineSize <= 2500) {
                duty = cif * 0.45;
                excise = 1.1 * (duty + cif);
            }
        }
        // VAT applies at 14%
        vat = 0.14 * (cif + duty + excise);
        totalTax = duty + excise + vat;
    }

    // Display the result
    document.getElementById("result").innerText = `
        CIF: $${cif.toFixed(2)}
        Duty: $${duty.toFixed(2)}
        Excise: $${excise.toFixed(2)}
        VAT: $${vat.toFixed(2)}
        Total Tax Payable: $${totalTax.toFixed(2)}
    `;
}
