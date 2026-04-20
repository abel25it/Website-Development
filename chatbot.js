(function () {
    var panelId = 'italian-chatbot-panel';
    var messagesId = 'italian-chatbot-messages';

    var siteMap = {
        home: {
            href: 'index.html',
            title: 'Home',
            summary: 'Brand story, awards, premium highlights, reviews, and direct actions to menu, order, and reservations.',
        },
        menu: {
            href: 'menu.html',
            title: 'Menu',
            summary: 'Signature pizzas, custom pizza builder, and live total pricing while you configure size, crust, sauce, and toppings.',
        },
        about: {
            href: 'about.html',
            title: 'About',
            summary: 'La Pizzeriaa story, kitchen philosophy, and premium Italian craft positioning.',
        },
        gallery: {
            href: 'gallery.html',
            title: 'Gallery',
            summary: 'Visual showcase of ovens, pizzas, and in-restaurant atmosphere.',
        },
        contact: {
            href: 'contact.html',
            title: 'Contact',
            summary: 'Reservation form and contact details. Open daily 11:00 AM to 11:00 PM.',
        },
        order: {
            href: 'order.html',
            title: 'Order',
            summary: 'Cart checkout, order form, loyalty profile, spin reward, birthday reward, referral and coupon redemption.',
        },
        login: {
            href: 'login.html?redirect=order.html',
            title: 'Login',
            summary: 'OTP-style sign-in to unlock personalized rewards and profile-linked benefits.',
        },
    };

    var baseQuickReplies = [
        'What can you do?',
        'Recommend pizza',
        'Customize pizza',
        'Rewards and login',
        'Book table',
        'Open now?',
    ];

    var pageQuickReplies = {
        menu: ['Veg options', 'Non-veg options', 'Go to order'],
        order: ['Track order', 'Use referral code', 'How rewards work'],
        contact: ['Reservation tips', 'Open now?'],
        gallery: ['Show menu', 'Book table'],
    };

    function createEl(tag, className, text) {
        var element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (typeof text === 'string') {
            element.textContent = text;
        }
        return element;
    }

    function getCurrentPageKey() {
        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('menu') > -1) {
            return 'menu';
        }
        if (path.indexOf('about') > -1) {
            return 'about';
        }
        if (path.indexOf('gallery') > -1) {
            return 'gallery';
        }
        if (path.indexOf('contact') > -1) {
            return 'contact';
        }
        if (path.indexOf('order') > -1) {
            return 'order';
        }
        if (path.indexOf('login') > -1) {
            return 'login';
        }
        return 'home';
    }

    function getOpenStatus() {
        var now = new Date();
        var hour = now.getHours();
        if (hour >= 11 && hour < 23) {
            return 'We are open now. Kitchen hours are 11:00 AM to 11:00 PM.';
        }
        if (hour < 11) {
            return 'We open today at 11:00 AM.';
        }
        return 'We are closed now and reopen tomorrow at 11:00 AM.';
    }

    function isMenuPage(pageKey) {
        return pageKey === 'menu' || pageKey === 'order';
    }

    function navActions() {
        return [
            { label: 'Home', href: siteMap.home.href },
            { label: 'Menu', href: siteMap.menu.href },
            { label: 'Order', href: siteMap.order.href },
            { label: 'Contact', href: siteMap.contact.href },
        ];
    }

    function normalizeInput(input) {
        return String(input || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function detectPageReference(input) {
        if (/home/.test(input)) {
            return 'home';
        }
        if (/menu/.test(input)) {
            return 'menu';
        }
        if (/about/.test(input)) {
            return 'about';
        }
        if (/gallery|photos|images/.test(input)) {
            return 'gallery';
        }
        if (/contact|reservation|book table|book/.test(input)) {
            return 'contact';
        }
        if (/order|cart|checkout|track/.test(input)) {
            return 'order';
        }
        if (/login|otp|sign in/.test(input)) {
            return 'login';
        }
        return '';
    }

    function getPageSummary(pageKey) {
        var page = siteMap[pageKey];
        if (!page) {
            return '';
        }
        return page.title + ': ' + page.summary;
    }

    function getMenuResponse(input) {
        if (/veg|vegetarian|no meat/.test(input)) {
            return {
                text: 'Best veg picks: Margherita Napoli, Verdura Fresca, and Tartufo Bianca. Veg custom toppings include mushrooms, black olives, caramelized onion, jalapeno, spinach, and sweet corn.',
                actions: [
                    { label: 'Open Menu', href: siteMap.menu.href },
                    { label: 'Build Pizza', href: 'menu.html#customize' },
                ],
            };
        }

        if (/non.?veg|meat|chicken|pepperoni/.test(input)) {
            return {
                text: 'Top non-veg options: Pepperoni Piccante and custom pizzas with pepperoni or grilled chicken toppings.',
                actions: [
                    { label: 'Open Menu', href: siteMap.menu.href },
                    { label: 'Go to Order', href: siteMap.order.href },
                ],
            };
        }

        if (/custom|build|toppings|crust|size|sauce|cheese|live price/.test(input)) {
            return {
                text: 'On the Menu page you can customize size, crust, sauce, cheese level, and toppings. The live price updates instantly as you choose options.',
                actions: [
                    { label: 'Customize Pizza', href: 'menu.html#customize' },
                    { label: 'Order Page', href: siteMap.order.href },
                ],
            };
        }

        return null;
    }

    function getRewardsResponse(input) {
        if (!/reward|loyal|coupon|referral|birthday|spin|login|otp|account|profile/.test(input)) {
            return null;
        }

        return {
            text: 'Rewards are profile-based. After OTP login, you can use spin rewards, birthday perks, referral code sharing, and coupon redemption from the Order page.',
            actions: [
                { label: 'Login', href: siteMap.login.href },
                { label: 'Open Rewards', href: siteMap.order.href },
            ],
        };
    }

    function getNavigationResponse(input) {
        if (!/go to|open|visit|take me|navigate/.test(input)) {
            return null;
        }

        var pageKey = detectPageReference(input);
        if (!pageKey || !siteMap[pageKey]) {
            return {
                text: 'Tell me which page you want to open: Home, Menu, About, Gallery, Contact, Order, or Login.',
                actions: navActions(),
            };
        }

        return {
            text: 'Opening suggestion: ' + getPageSummary(pageKey),
            actions: [{ label: 'Go to ' + siteMap[pageKey].title, href: siteMap[pageKey].href }],
        };
    }

    function addMessage(content, role) {
        var wrap = document.getElementById(messagesId);
        if (!wrap) {
            return;
        }

        var payload = typeof content === 'string' ? { text: content } : (content || {});

        var msg = createEl('div', 'chatbot-msg ' + role);
        var text = createEl('p', 'chatbot-msg-text', payload.text || '');
        msg.appendChild(text);

        if (payload.actions && payload.actions.length) {
            var actionWrap = createEl('div', 'chatbot-actions');
            payload.actions.forEach(function (action) {
                var actionEl;
                if (action.href) {
                    actionEl = createEl('a', 'chatbot-action', action.label);
                    actionEl.href = action.href;
                } else {
                    actionEl = createEl('button', 'chatbot-action', action.label);
                    actionEl.type = 'button';
                    actionEl.addEventListener('click', function () {
                        handleUserMessage(action.query || action.label);
                    });
                }
                actionWrap.appendChild(actionEl);
            });
            msg.appendChild(actionWrap);
        }

        wrap.appendChild(msg);
        wrap.scrollTop = wrap.scrollHeight;
    }

    function getResponse(input) {
        var normalized = normalizeInput(input);
        var currentPage = getCurrentPageKey();
        var requestedPage = detectPageReference(normalized);

        var navResponse = getNavigationResponse(normalized);
        if (navResponse) {
            return navResponse;
        }

        if (/hello|hi|hey|ciao|buongiorno|good evening/.test(normalized)) {
            return {
                text: 'Ciao. I am Lui, your La Pizzeriaa assistant. I can guide you through menu, custom pizza, rewards, login, reservations, and page navigation.',
                actions: [
                    { label: 'Show Menu', href: siteMap.menu.href },
                    { label: 'Book Table', href: siteMap.contact.href },
                ],
            };
        }

        if (/what can you do|help|guide|commands|everything/.test(normalized)) {
            return {
                text: 'I know the full website: menu and customization, order and checkout flow, rewards and OTP login, gallery, about story, reservations, timings, and dark mode guidance.',
                actions: navActions(),
            };
        }

        if (/this page|here|what is on this page/.test(normalized)) {
            return {
                text: getPageSummary(currentPage),
                actions: [{ label: 'Go to Order', href: siteMap.order.href }],
            };
        }

        if (/open now|timing|hours|time/.test(normalized)) {
            return {
                text: getOpenStatus(),
                actions: [{ label: 'Reserve Table', href: siteMap.contact.href }],
            };
        }

        if (/recommend|best|popular|signature/.test(normalized)) {
            return {
                text: 'Most-loved picks: Margherita Napoli for classic balance, Pepperoni Piccante for spice, Verdura Fresca for fresh veg flavor, and Tartufo Bianca for rich premium taste.',
                actions: [
                    { label: 'Open Menu', href: siteMap.menu.href },
                    { label: 'Order Now', href: siteMap.order.href },
                ],
            };
        }

        var menuResponse = getMenuResponse(normalized);
        if (menuResponse) {
            return menuResponse;
        }

        if (/track|status|where is my order/.test(normalized)) {
            return {
                text: 'You can review current cart and submit orders on the Order page. This site does not have live courier tracking yet, but checkout and rewards are fully available.',
                actions: [
                    { label: 'Open Order', href: siteMap.order.href },
                    { label: 'Back to Menu', href: siteMap.menu.href },
                ],
            };
        }

        if (/book|reservation|table|contact/.test(normalized)) {
            return {
                text: 'For reservations, open Contact and fill the table booking form with date, time, guest count, and notes. We are open daily 11:00 AM to 11:00 PM.',
                actions: [
                    { label: 'Reserve Table', href: siteMap.contact.href },
                    { label: 'View Menu', href: siteMap.menu.href },
                ],
            };
        }

        if (/about|story|brand|who are you/.test(normalized)) {
            return {
                text: siteMap.about.summary,
                actions: [{ label: 'Read About Page', href: siteMap.about.href }],
            };
        }

        if (/gallery|photos|images/.test(normalized)) {
            return {
                text: siteMap.gallery.summary,
                actions: [
                    { label: 'Open Gallery', href: siteMap.gallery.href },
                    { label: 'Browse Menu', href: siteMap.menu.href },
                ],
            };
        }

        if (/dark mode|theme/.test(normalized)) {
            return {
                text: 'Use the Dark mode toggle in the top navigation. The site supports premium styling in both light and dark themes.',
            };
        }

        var rewardsResponse = getRewardsResponse(normalized);
        if (rewardsResponse) {
            return rewardsResponse;
        }

        if (requestedPage && siteMap[requestedPage]) {
            return {
                text: getPageSummary(requestedPage),
                actions: [{ label: 'Open ' + siteMap[requestedPage].title, href: siteMap[requestedPage].href }],
            };
        }

        return {
            text: 'Grazie. I can help with menu picks, customization, checkout, rewards, login, bookings, timings, and navigating every page of the site.',
            actions: isMenuPage(currentPage)
                ? [
                    { label: 'Recommend Pizza', query: 'Recommend pizza' },
                    { label: 'Customize Pizza', query: 'Customize pizza' },
                    { label: 'Rewards & Login', query: 'Rewards and login' },
                ]
                : [
                    { label: 'Open Menu', href: siteMap.menu.href },
                    { label: 'Book Table', href: siteMap.contact.href },
                    { label: 'Open Order', href: siteMap.order.href },
                ],
        };
    }

    function handleUserMessage(rawText) {
        var text = (rawText || '').trim();
        if (!text) {
            return;
        }

        addMessage(text, 'user');

        window.setTimeout(function () {
            addMessage(getResponse(text), 'bot');
        }, 220);
    }

    function getQuickReplies() {
        var currentPage = getCurrentPageKey();
        var pageItems = pageQuickReplies[currentPage] || [];
        return baseQuickReplies.concat(pageItems).slice(0, 9);
    }

    function buildWidget() {
        var toggle = createEl('button', 'chatbot-toggle', 'Chat with Lui');
        toggle.type = 'button';
        toggle.setAttribute('aria-controls', panelId);
        toggle.setAttribute('aria-expanded', 'false');

        var panel = createEl('section', 'chatbot-panel');
        panel.id = panelId;
        panel.hidden = true;
        panel.setAttribute('aria-label', 'Italian chat assistant');

        var header = createEl('div', 'chatbot-header');
        var title = createEl('p', 'chatbot-title', 'Lui - Chef Assistente');
        var subtitle = createEl('p', 'chatbot-subtitle', 'Ciao. Ask me anything about your pizza experience.');
        header.appendChild(title);
        header.appendChild(subtitle);

        var messages = createEl('div', 'chatbot-messages');
        messages.id = messagesId;

        var chipWrap = createEl('div', 'chatbot-quick-replies');
        getQuickReplies().forEach(function (reply) {
            var chip = createEl('button', 'chatbot-chip', reply);
            chip.type = 'button';
            chip.addEventListener('click', function () {
                handleUserMessage(reply);
            });
            chipWrap.appendChild(chip);
        });

        var form = createEl('form', 'chatbot-form');
        var input = createEl('input', 'chatbot-input');
        input.type = 'text';
        input.name = 'chatbot-message';
        input.placeholder = 'Type your question...';
        input.autocomplete = 'off';

        var sendBtn = createEl('button', 'chatbot-send', 'Send');
        sendBtn.type = 'submit';

        form.appendChild(input);
        form.appendChild(sendBtn);

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            handleUserMessage(input.value);
            input.value = '';
            input.focus();
        });

        toggle.addEventListener('click', function () {
            panel.hidden = !panel.hidden;
            var expanded = !panel.hidden;
            toggle.setAttribute('aria-expanded', String(expanded));
            toggle.textContent = expanded ? 'Close Chat' : 'Chat with Lui';
            if (expanded) {
                input.focus();
            }
        });

        panel.appendChild(header);
        panel.appendChild(messages);
        panel.appendChild(chipWrap);
        panel.appendChild(form);

        document.body.appendChild(toggle);
        document.body.appendChild(panel);

        addMessage({
            text: 'Benvenuto. I am Lui. I know every part of this website and can guide menu choices, customization, orders, rewards, login, bookings, and page navigation.',
            actions: [
                { label: 'Menu', href: siteMap.menu.href },
                { label: 'Order', href: siteMap.order.href },
                { label: 'Book Table', href: siteMap.contact.href },
            ],
        }, 'bot');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildWidget);
        return;
    }

    buildWidget();
})();
