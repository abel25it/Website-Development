(function () {
    var ORDER_KEY = 'la-pizzeriaa-order-items';
    var PIZZAS_PER_BATCH = 3;
    var MINUTES_PER_BATCH = 10;
    var MAX_ESTIMATED_MINUTES = 40;
    var MAX_PIZZAS_PER_ORDER = 15;
    var itemsWrap = document.querySelector('#order-items');
    var emptyText = document.querySelector('#order-empty');
    var totalEl = document.querySelector('#order-total');
    var clearButton = document.querySelector('#clear-order');
    var checkoutForm = document.querySelector('#checkout-form');

    function notify(message, type) {
        if (window.LaPizzeriaaNotify && typeof window.LaPizzeriaaNotify.show === 'function') {
            window.LaPizzeriaaNotify.show(message, type || 'info');
        }
    }

    if (!itemsWrap || !emptyText || !totalEl || !clearButton || !checkoutForm) {
        return;
    }

    var inrFormatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    });

    function getItems() {
        try {
            var data = JSON.parse(window.localStorage.getItem(ORDER_KEY) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function saveItems(items) {
        window.localStorage.setItem(ORDER_KEY, JSON.stringify(items));
        window.dispatchEvent(new Event('la-pizzeriaa-order-updated'));
    }

    function removeItem(itemId) {
        var items = getItems().filter(function (item) {
            return String(item.id) !== String(itemId);
        });
        saveItems(items);
        render();
    }

    function updateQty(itemId, delta) {
        var items = getItems();
        var currentTotalQty = items.reduce(function (sum, item) {
            return sum + Number(item.qty || 0);
        }, 0);

        if (delta > 0 && currentTotalQty >= MAX_PIZZAS_PER_ORDER) {
            notify('Maximum ' + MAX_PIZZAS_PER_ORDER + ' pizzas allowed in a single order.', 'error');
            return;
        }

        items.forEach(function (item) {
            if (String(item.id) === String(itemId)) {
                item.qty = Math.max(1, Number(item.qty || 1) + delta);
            }
        });
        saveItems(items);
        render();
    }

    function getEstimatedPrepMinutes(totalQty) {
        var qty = Math.max(0, Number(totalQty || 0));
        if (!qty) {
            return 0;
        }

        var estimate = Math.ceil(qty / PIZZAS_PER_BATCH) * MINUTES_PER_BATCH;
        return Math.min(estimate, MAX_ESTIMATED_MINUTES);
    }

    function renderPrepTime(totalQty) {
        var prepMinsNode = document.querySelector('#prep-time-mins');
        var prepNoteNode = document.querySelector('#prep-time-note');
        var qty = Math.max(0, Number(totalQty || 0));
        var mins = getEstimatedPrepMinutes(qty);

        if (prepMinsNode) {
            prepMinsNode.textContent = String(mins);
        }

        if (!prepNoteNode) {
            return;
        }

        if (!qty) {
            prepNoteNode.textContent = 'Add pizzas to view estimated preparation time. Up to 15 pizzas can be ordered, and the estimate is capped at 40 minutes.';
            return;
        }

        prepNoteNode.textContent = 'Estimated time for ' + qty + ' pizza' + (qty > 1 ? 's' : '') + ': about ' + mins + ' minutes.';
    }

    function render() {
        var items = getItems();
        itemsWrap.innerHTML = '';

        if (!items.length) {
            emptyText.style.display = 'block';
            totalEl.textContent = inrFormatter.format(0);
            renderPrepTime(0);
            var subtotalNode = document.querySelector('#order-subtotal');
            if (subtotalNode) {
                subtotalNode.textContent = inrFormatter.format(0);
            }

            var couponStatusNode = document.querySelector('[data-loyalty-coupon-status]');
            if (couponStatusNode) {
                couponStatusNode.textContent = 'No coupon active yet.';
            }
            return;
        }

        emptyText.style.display = 'none';

        var total = 0;
        var totalQty = 0;
        items.forEach(function (item) {
            var qty = Number(item.qty || 1);
            var lineTotal = Number(item.price || 0) * qty;
            total += lineTotal;
            totalQty += qty;

            var row = document.createElement('div');
            row.className = 'order-item';

            row.innerHTML =
                '<div>' +
                    '<p class="order-item-name">' + item.name + '</p>' +
                    '<p class="order-item-details">' + (item.details || '') + '</p>' +
                    '<p class="order-item-price">' + inrFormatter.format(lineTotal) + '</p>' +
                '</div>' +
                '<div class="order-controls">' +
                    '<button type="button" class="qty-btn" data-action="minus" data-id="' + item.id + '">-</button>' +
                    '<span class="qty-value">' + qty + '</span>' +
                    '<button type="button" class="qty-btn" data-action="plus" data-id="' + item.id + '">+</button>' +
                    '<button type="button" class="remove-btn" data-action="remove" data-id="' + item.id + '">Remove</button>' +
                '</div>';

            itemsWrap.appendChild(row);
        });

        renderPrepTime(totalQty);

        var checkoutTotals = window.LaPizzeriaaRewards && typeof window.LaPizzeriaaRewards.getCheckoutTotals === 'function'
            ? window.LaPizzeriaaRewards.getCheckoutTotals(total)
            : { subtotal: total, discount: 0, finalTotal: total, couponCode: '', couponLabel: '', couponPointsBonus: 0 };

        totalEl.textContent = inrFormatter.format(checkoutTotals.finalTotal);

        var subtotalNode = document.querySelector('#order-subtotal');
        if (subtotalNode) {
            subtotalNode.textContent = inrFormatter.format(checkoutTotals.subtotal);
        }

        var couponStatusNode = document.querySelector('[data-loyalty-coupon-status]');
        if (couponStatusNode) {
            couponStatusNode.textContent = checkoutTotals.couponLabel
                ? checkoutTotals.couponCode + ' applied - ' + inrFormatter.format(checkoutTotals.discount) + ' saved.'
                : 'No coupon active yet.';
        }

        var couponSavingsNode = document.querySelector('[data-loyalty-coupon-savings]');
        if (couponSavingsNode) {
            couponSavingsNode.textContent = checkoutTotals.couponLabel
                ? checkoutTotals.couponLabel + ' (' + checkoutTotals.couponCode + ')'
                : 'Apply a code to unlock savings.';
        }
    }

    itemsWrap.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        var action = target.dataset.action;
        var itemId = target.dataset.id;

        if (!action || !itemId) {
            return;
        }

        if (action === 'remove') {
            removeItem(itemId);
            return;
        }

        if (action === 'plus') {
            updateQty(itemId, 1);
            return;
        }

        if (action === 'minus') {
            updateQty(itemId, -1);
        }
    });

    clearButton.addEventListener('click', function () {
        saveItems([]);
        render();
    });

    window.addEventListener('la-pizzeriaa-loyalty-updated', render);
    window.addEventListener('la-pizzeriaa-auth-updated', render);

    checkoutForm.addEventListener('submit', function (event) {
        event.preventDefault();

        if (window.LaPizzeriaaAuth && typeof window.LaPizzeriaaAuth.requireLogin === 'function') {
            if (!window.LaPizzeriaaAuth.requireLogin('Please log in before placing your order.')) {
                return;
            }
        }

        var items = getItems();
        if (!items.length) {
            notify('Your order is empty. Please add pizza from the menu.', 'error');
            return;
        }

        var subtotal = items.reduce(function (sum, item) {
            return sum + (Number(item.price || 0) * Number(item.qty || 1));
        }, 0);

        var checkoutTotals = window.LaPizzeriaaRewards && typeof window.LaPizzeriaaRewards.getCheckoutTotals === 'function'
            ? window.LaPizzeriaaRewards.getCheckoutTotals(subtotal)
            : { subtotal: subtotal, discount: 0, finalTotal: subtotal, couponCode: '', couponLabel: '', couponPointsBonus: 0 };

        var pointsEarned = Math.max(25, Math.floor(checkoutTotals.finalTotal / 20)) + Number(checkoutTotals.couponPointsBonus || 0);

        if (window.LaPizzeriaaRewards && typeof window.LaPizzeriaaRewards.addPoints === 'function') {
            window.LaPizzeriaaRewards.addPoints(pointsEarned, checkoutTotals.finalTotal);
        }

        if (window.LaPizzeriaaRewards && typeof window.LaPizzeriaaRewards.clearCoupon === 'function') {
            window.LaPizzeriaaRewards.clearCoupon();
        }

        saveItems([]);
        render();
        checkoutForm.reset();
        notify('Thank you. Your order has been placed successfully. You earned ' + pointsEarned + ' loyalty points.', 'success');
    });

    render();
})();
