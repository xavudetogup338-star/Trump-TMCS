const exchangeRates = {
    USDT: 12500.16,
    USDC: 12500.16,
    SOL: 2627343.65
};

let currentCurrency = 'SOL';
let isCalculating = false;

export function initPresaleConverter() {
    const cryptoAmountInput = document.getElementById('crypto-amount');
    const truthxAmountInput = document.getElementById('truthx-amount');
    const currencyLabel = document.getElementById('currency-label');
    const paymentTabs = document.querySelectorAll('.payment-tabs .tab-btn');

    if (!cryptoAmountInput || !truthxAmountInput || !currencyLabel || !paymentTabs.length) {
        return; // Exit if elements are not found
    }

    function updateCurrency(newCurrency) {
        currentCurrency = newCurrency;
        currencyLabel.textContent = newCurrency;
        paymentTabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-currency') === newCurrency);
        });
        cryptoAmountInput.value = '';
        truthxAmountInput.value = '';
    }

    paymentTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            updateCurrency(tab.getAttribute('data-currency'));
        });
    });

    cryptoAmountInput.addEventListener('input', () => {
        if (isCalculating) return;
        isCalculating = true;

        const cryptoValue = parseFloat(cryptoAmountInput.value);
        if (!isNaN(cryptoValue) && cryptoValue > 0) {
            const truthxValue = cryptoValue * exchangeRates[currentCurrency];
            truthxAmountInput.value = truthxValue.toFixed(2);
        } else {
            truthxAmountInput.value = '';
        }
        isCalculating = false;
    });

    truthxAmountInput.addEventListener('input', () => {
        if (isCalculating) return;
        isCalculating = true;

        const truthxValue = parseFloat(truthxAmountInput.value);
        if (!isNaN(truthxValue) && truthxValue > 0) {
            const cryptoValue = truthxValue / exchangeRates[currentCurrency];
            cryptoAmountInput.value = cryptoValue.toFixed(6);
        } else {
            cryptoAmountInput.value = '';
        }
        isCalculating = false;
    });
}