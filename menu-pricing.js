(function () {
    var form = document.querySelector('.pizza-customizer');
    if (!form) {
        return;
    }

    var inrFormatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    });

    var sizeSelect = form.querySelector('#size');
    var crustSelect = form.querySelector('#crust');
    var sauceSelect = form.querySelector('#sauce');
    var cheeseSelect = form.querySelector('#cheese');
    var toppingInputs = form.querySelectorAll('input[name="toppings"]');
    var priceValue = form.querySelector('#live-price-value');

    function getSelectedPrice(selectElement) {
        if (!selectElement || !selectElement.selectedOptions.length) {
            return 0;
        }

        var selectedOption = selectElement.selectedOptions[0];
        return Number(selectedOption.dataset.price || 0);
    }

    function getToppingsTotal() {
        var total = 0;

        toppingInputs.forEach(function (input) {
            if (input.checked) {
                total += Number(input.dataset.price || 0);
            }
        });

        return total;
    }

    function updateLivePrice() {
        var total = 0;

        total += getSelectedPrice(sizeSelect);
        total += getSelectedPrice(crustSelect);
        total += getSelectedPrice(sauceSelect);
        total += getSelectedPrice(cheeseSelect);
        total += getToppingsTotal();

        priceValue.textContent = inrFormatter.format(total);
    }

    form.addEventListener('input', updateLivePrice);
    form.addEventListener('change', updateLivePrice);

    updateLivePrice();
})();
