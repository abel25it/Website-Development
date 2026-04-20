(function () {
    var ORDER_KEY = 'la-pizzeriaa-order-items';
    var ORDER_LINK_SELECTOR = '.nav-links a[href="order.html"]';

    function getItems() {
        try {
            var data = JSON.parse(window.localStorage.getItem(ORDER_KEY) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function getItemCount(items) {
        return items.reduce(function (total, item) {
            return total + Math.max(1, Number(item.qty || 1));
        }, 0);
    }

    function updateOrderNavCount() {
        var links = document.querySelectorAll(ORDER_LINK_SELECTOR);
        if (!links.length) {
            return;
        }

        var count = getItemCount(getItems());
        var label = count > 0 ? 'Order (' + count + ')' : 'Order';

        links.forEach(function (link) {
            link.textContent = label;
            link.setAttribute('aria-label', count > 0 ? 'Order, ' + count + ' items in cart' : 'Order');
        });
    }

    window.addEventListener('storage', function (event) {
        if (event.key === ORDER_KEY || event.key === null) {
            updateOrderNavCount();
        }
    });

    window.addEventListener('la-pizzeriaa-order-updated', updateOrderNavCount);

    updateOrderNavCount();
})();