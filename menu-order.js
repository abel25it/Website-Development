(function () {
    var ORDER_KEY = 'la-pizzeriaa-order-items';
    var MAX_PIZZAS_PER_ORDER = 15;
    var form = document.querySelector('.pizza-customizer');
    var itemButtons = document.querySelectorAll('.order-menu-btn');
    var floatingOrderButton = document.querySelector('#floating-order-btn');
    var floatingOrderCount = document.querySelector('#floating-order-count');
    var feedbackTimer = null;

    function flashButton(button) {
        if (!button) {
            return;
        }

        button.classList.remove('btn-added');
        void button.offsetWidth;
        button.classList.add('btn-added');

        window.setTimeout(function () {
            button.classList.remove('btn-added');
        }, 520);
    }

    function bumpFloatingOrderButton() {
        if (!floatingOrderButton) {
            return;
        }

        floatingOrderButton.classList.remove('added-bump');
        void floatingOrderButton.offsetWidth;
        floatingOrderButton.classList.add('added-bump');

        window.setTimeout(function () {
            floatingOrderButton.classList.remove('added-bump');
        }, 520);
    }

    function getFeedbackToast() {
        var existing = document.querySelector('#order-feedback-toast');
        if (existing) {
            return existing;
        }

        var toast = document.createElement('div');
        toast.id = 'order-feedback-toast';
        toast.className = 'order-feedback-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
        return toast;
    }

    function showAddedToast(message) {
        var toast = getFeedbackToast();
        toast.textContent = message || 'Added to order';
        toast.classList.remove('show');
        void toast.offsetWidth;
        toast.classList.add('show');

        if (feedbackTimer) {
            window.clearTimeout(feedbackTimer);
        }

        feedbackTimer = window.setTimeout(function () {
            toast.classList.remove('show');
            feedbackTimer = null;
        }, 1400);
    }

    function showAddFeedback(button, itemName) {
        flashButton(button);
        bumpFloatingOrderButton();
        showAddedToast((itemName || 'Item') + ' added to order');
    }

    function getOrderItems() {
        try {
            var data = JSON.parse(window.localStorage.getItem(ORDER_KEY) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function saveOrderItems(items) {
        window.localStorage.setItem(ORDER_KEY, JSON.stringify(items));
        window.dispatchEvent(new Event('la-pizzeriaa-order-updated'));
        updateFloatingOrderButton(items);
    }

    function updateFloatingOrderButton(items) {
        if (!floatingOrderButton || !floatingOrderCount) {
            return;
        }

        var totalItems = items.reduce(function (sum, item) {
            return sum + Number(item.qty || 0);
        }, 0);

        floatingOrderCount.textContent = String(totalItems);
        floatingOrderButton.classList.toggle('has-items', totalItems > 0);
    }

    function addOrderItem(newItem) {
        var items = getOrderItems();
        var totalQty = items.reduce(function (sum, item) {
            return sum + Number(item.qty || 0);
        }, 0);

        if (totalQty >= MAX_PIZZAS_PER_ORDER) {
            return {
                ok: false,
                message: 'Maximum ' + MAX_PIZZAS_PER_ORDER + ' pizzas allowed in a single order.',
            };
        }

        var existing = items.find(function (item) {
            return item.name === newItem.name && item.details === newItem.details && item.price === newItem.price;
        });

        if (existing) {
            existing.qty += 1;
        } else {
            items.push({
                id: Date.now() + Math.random(),
                name: newItem.name,
                details: newItem.details,
                price: newItem.price,
                qty: 1,
            });
        }

        saveOrderItems(items);
        return { ok: true };
    }

    function getSelectValue(selectElement) {
        if (!selectElement || !selectElement.selectedOptions.length) {
            return '';
        }
        return selectElement.selectedOptions[0].textContent;
    }

    function getSelectedPrice(selectElement) {
        if (!selectElement || !selectElement.selectedOptions.length) {
            return 0;
        }
        return Number(selectElement.selectedOptions[0].dataset.price || 0);
    }

    itemButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            var result = addOrderItem({
                name: button.dataset.name || 'Pizza',
                details: 'From menu',
                price: Number(button.dataset.price || 0),
            });

            if (!result.ok) {
                showAddedToast(result.message);
                return;
            }

            showAddFeedback(button, button.dataset.name || 'Pizza');
        });
    });

    if (!form) {
        return;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var sizeSelect = form.querySelector('#size');
        var crustSelect = form.querySelector('#crust');
        var sauceSelect = form.querySelector('#sauce');
        var cheeseSelect = form.querySelector('#cheese');
        var toppingInputs = form.querySelectorAll('input[name="toppings"]:checked');

        var total = 0;
        total += getSelectedPrice(sizeSelect);
        total += getSelectedPrice(crustSelect);
        total += getSelectedPrice(sauceSelect);
        total += getSelectedPrice(cheeseSelect);

        var toppings = [];
        toppingInputs.forEach(function (input) {
            total += Number(input.dataset.price || 0);
            toppings.push(input.parentElement.textContent.trim().replace(/\s*\(\+₹\d+\)$/, ''));
        });

        var detailParts = [
            getSelectValue(sizeSelect),
            getSelectValue(crustSelect),
            getSelectValue(sauceSelect),
            getSelectValue(cheeseSelect),
        ];

        if (toppings.length) {
            detailParts.push('Toppings: ' + toppings.join(', '));
        }

        var addResult = addOrderItem({
            name: 'Customized Pizza',
            details: detailParts.filter(Boolean).join(' | '),
            price: total,
        });

        if (!addResult.ok) {
            showAddedToast(addResult.message);
            return;
        }

        showAddFeedback(form.querySelector('button[type="submit"]'), 'Customized pizza');

        form.reset();
    });

    updateFloatingOrderButton(getOrderItems());
})();
