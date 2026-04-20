(function () {
    var LOYALTY_KEY = 'la-pizzeriaa-loyalty';
    var COUPON_CODES = {
        NEW10: { type: 'percent', value: 10, minSubtotal: 999, label: '10% off for new customers above ₹999', pointsBonus: 20, firstOrderOnly: true },
        PIZZA10: { type: 'percent', value: 5, minSubtotal: 999, label: '5% off above ₹999', pointsBonus: 20 },
        FEAST20: { type: 'percent', value: 10, maxOff: 250, minSubtotal: 1699, label: '10% off up to ₹250 above ₹1699', pointsBonus: 40 },
        CHEESE50: { type: 'flat', value: 80, minSubtotal: 1199, label: '₹80 off above ₹1199', pointsBonus: 15 },
    };

    var DAILY_SPIN_REWARDS = [
        { type: 'points', value: 20, label: '20 bonus points' },
        { type: 'points', value: 40, label: '40 bonus points' },
        { type: 'points', value: 60, label: '60 bonus points' },
        { type: 'coupon', code: 'PIZZA10', label: '10% off coupon unlocked' },
        { type: 'coupon', code: 'CHEESE50', label: '₹50 off coupon unlocked' },
    ];

    var tiers = [
        { name: 'Starter', min: 0, perks: 'Earn points on every order.' },
        { name: 'Insider', min: 300, perks: 'Free dip on your next visit.' },
        { name: 'VIP', min: 700, perks: 'Priority prep and surprise offers.' },
        { name: 'Legend', min: 1200, perks: 'Exclusive menu previews and special treats.' },
    ];

    function getTodayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    function isLoggedIn() {
        if (window.LaPizzeriaaAuth && typeof window.LaPizzeriaaAuth.isLoggedIn === 'function') {
            return window.LaPizzeriaaAuth.isLoggedIn();
        }

        try {
            var fallback = JSON.parse(window.localStorage.getItem('la-pizzeriaa-auth') || 'null');
            return !!(fallback && fallback.phone);
        } catch (error) {
            return false;
        }
    }

    function getAuthUser() {
        if (window.LaPizzeriaaAuth && typeof window.LaPizzeriaaAuth.getAuth === 'function') {
            return window.LaPizzeriaaAuth.getAuth();
        }

        try {
            return JSON.parse(window.localStorage.getItem('la-pizzeriaa-auth') || 'null');
        } catch (error) {
            return null;
        }
    }

    function getUserLoyaltyKey() {
        if (!isLoggedIn()) {
            return '';
        }

        var auth = getAuthUser();
        var phone = auth && auth.phone ? String(auth.phone).replace(/\D/g, '') : '';
        if (!phone) {
            return '';
        }

        return LOYALTY_KEY + ':' + phone;
    }

    function ensureLoggedIn(message) {
        if (window.LaPizzeriaaAuth && typeof window.LaPizzeriaaAuth.requireLogin === 'function') {
            return window.LaPizzeriaaAuth.requireLogin(message);
        }

        if (isLoggedIn()) {
            return true;
        }

        if (window.LaPizzeriaaNotify && typeof window.LaPizzeriaaNotify.show === 'function') {
            window.LaPizzeriaaNotify.show(message || 'Please log in first.', 'info');
        }
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
        return false;
    }

    function notify(message, type) {
        if (window.LaPizzeriaaNotify && typeof window.LaPizzeriaaNotify.show === 'function') {
            window.LaPizzeriaaNotify.show(message, type || 'info');
        }
    }

    function generateReferralCode() {
        return 'LP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    }

    function normalizeCouponCode(code) {
        return String(code || '').trim().toUpperCase();
    }

    function normalizeDateString(dateString) {
        return String(dateString || '').trim();
    }

    function ensureProfile(profile) {
        var next = profile || {};
        if (!Array.isArray(next.claimedReferralCodes)) {
            next.claimedReferralCodes = [];
        }
        if (!next.referralCode) {
            next.referralCode = generateReferralCode();
        }
        if (!next.coupons) {
            next.coupons = {};
        }
        return next;
    }

    function getBaseProfile() {
        return {
            points: 0,
            orders: 0,
            visits: 0,
            claimedReferralCodes: [],
            coupons: {},
            activeCouponCode: '',
            activeCouponAppliedAt: 0,
            birthday: '',
            birthdayBonusYear: 0,
            spinDate: '',
            spinRewardLabel: '',
            lastOrderTotal: 0,
        };
    }

    function getLoggedOutProfile() {
        var profile = ensureProfile(getBaseProfile());
        profile.referralCode = 'LOGIN REQUIRED';
        return profile;
    }

    function getProfile() {
        if (!isLoggedIn()) {
            return getLoggedOutProfile();
        }

        var key = getUserLoyaltyKey();
        if (!key) {
            return ensureProfile(getBaseProfile());
        }

        try {
            var raw = window.localStorage.getItem(key);
            if (!raw) {
                return ensureProfile(getBaseProfile());
            }

            var data = JSON.parse(raw);
            return ensureProfile({
                points: Number(data.points || 0),
                orders: Number(data.orders || 0),
                visits: Number(data.visits || 0),
                spinDate: data.spinDate || '',
                spinRewardLabel: data.spinRewardLabel || '',
                referralCode: data.referralCode === 'LOGIN-FIRST' ? '' : (data.referralCode || ''),
                claimedReferralCodes: Array.isArray(data.claimedReferralCodes) ? data.claimedReferralCodes : [],
                birthday: normalizeDateString(data.birthday || ''),
                birthdayBonusYear: Number(data.birthdayBonusYear || 0),
                coupons: data.coupons || {},
                activeCouponCode: normalizeCouponCode(data.activeCouponCode || ''),
                activeCouponAppliedAt: Number(data.activeCouponAppliedAt || 0),
                lastOrderTotal: Number(data.lastOrderTotal || 0),
            });
        } catch (error) {
            return ensureProfile(getBaseProfile());
        }
    }

    function saveProfile(profile) {
        if (!isLoggedIn()) {
            return;
        }

        var key = getUserLoyaltyKey();
        if (!key) {
            return;
        }

        window.localStorage.setItem(key, JSON.stringify(ensureProfile(profile)));
        window.dispatchEvent(new Event('la-pizzeriaa-loyalty-updated'));
    }

    function getTier(points) {
        var active = tiers[0];

        tiers.forEach(function (tier) {
            if (points >= tier.min) {
                active = tier;
            }
        });

        return active;
    }

    function getNextTier(points) {
        for (var i = 0; i < tiers.length; i += 1) {
            if (points < tiers[i].min) {
                return tiers[i];
            }
        }

        return null;
    }

    function addPoints(pointsEarned, orderTotal) {
        if (!isLoggedIn()) {
            return getProfile();
        }

        var profile = getProfile();
        var points = Math.max(0, Number(pointsEarned || 0));
        profile.points += points;
        profile.orders += 1;
        if (orderTotal) {
            profile.lastOrderTotal = Number(orderTotal);
        }
        saveProfile(profile);
        return profile;
    }

    function awardBonusPoints(points, reason) {
        if (!isLoggedIn()) {
            return getProfile();
        }

        var profile = getProfile();
        profile.points += Math.max(0, Number(points || 0));
        profile.lastBonusReason = reason || 'bonus';
        saveProfile(profile);
        return profile;
    }

    function getCouponDefinition(code) {
        return COUPON_CODES[normalizeCouponCode(code)] || null;
    }

    function getActiveCoupon(profile) {
        var currentProfile = profile || getProfile();
        var code = normalizeCouponCode(currentProfile.activeCouponCode || '');
        var coupon = code ? getCouponDefinition(code) : null;
        if (!coupon) {
            return null;
        }

        return {
            code: code,
            label: coupon.label,
            pointsBonus: coupon.pointsBonus,
            discount: coupon,
        };
    }

    function calculateCouponDiscount(subtotal, coupon) {
        if (!coupon) {
            return 0;
        }

        if (coupon.type === 'flat') {
            return Math.min(subtotal, coupon.value);
        }

        if (coupon.type === 'percent') {
            var percentValue = Math.round((subtotal * coupon.value) / 100);
            if (typeof coupon.maxOff === 'number') {
                return Math.min(percentValue, coupon.maxOff);
            }
            return percentValue;
        }

        return 0;
    }

    function hasCouponBeenUsed(profile, code) {
        var currentProfile = profile || getProfile();
        var normalizedCode = normalizeCouponCode(code);
        if (!normalizedCode) {
            return true;
        }

        return !!currentProfile.coupons[normalizedCode];
    }

    function validateCouponForProfile(profile, code, coupon, subtotal) {
        var currentProfile = profile || getProfile();
        var subtotalValue = Math.max(0, Number(subtotal || 0));
        var normalizedCode = normalizeCouponCode(code);

        if (!coupon) {
            return { ok: false, message: 'That coupon code is not valid.' };
        }

        if (!subtotalValue) {
            return { ok: false, message: 'Add pizza items before applying a coupon.' };
        }

        if (coupon.firstOrderOnly) {
            if (hasCouponBeenUsed(currentProfile, normalizedCode)) {
                return { ok: false, message: normalizedCode + ' has already been used on your account.' };
            }

            if (Number(currentProfile.orders || 0) > 0) {
                return { ok: false, message: normalizedCode + ' is only for new customers on their first order.' };
            }
        }

        if (typeof coupon.minSubtotal === 'number' && subtotalValue < coupon.minSubtotal) {
            return {
                ok: false,
                message: 'This code needs a minimum order of ₹' + coupon.minSubtotal + '.',
            };
        }

        var discount = calculateCouponDiscount(subtotalValue, coupon);
        if (discount <= 0) {
            return { ok: false, message: 'This coupon is not applicable to your current order.' };
        }

        return { ok: true, discount: discount, subtotal: subtotalValue };
    }

    function getBestCouponForSubtotal(subtotal) {
        var subtotalValue = Math.max(0, Number(subtotal || 0));
        var profile = getProfile();
        var best = null;

        if (!subtotalValue) {
            return null;
        }

        Object.keys(COUPON_CODES).forEach(function (code) {
            var coupon = COUPON_CODES[code];
            if (!coupon) {
                return;
            }

            if (coupon.firstOrderOnly) {
                if (hasCouponBeenUsed(profile, code)) {
                    return;
                }

                if (Number(profile.orders || 0) > 0) {
                    return;
                }
            }

            if (typeof coupon.minSubtotal === 'number' && subtotalValue < coupon.minSubtotal) {
                return;
            }

            var discount = calculateCouponDiscount(subtotalValue, coupon);
            if (discount <= 0) {
                return;
            }

            if (!best || discount > best.discount) {
                best = {
                    code: code,
                    coupon: coupon,
                    discount: discount,
                };
            }
        });

        return best;
    }

    function getCheckoutTotals(subtotal) {
        var profile = getProfile();
        var activeCoupon = getActiveCoupon(profile);
        var discount = activeCoupon ? calculateCouponDiscount(subtotal, activeCoupon.discount) : 0;
        var finalTotal = Math.max(0, subtotal - discount);

        return {
            subtotal: subtotal,
            discount: discount,
            finalTotal: finalTotal,
            couponCode: activeCoupon ? activeCoupon.code : '',
            couponLabel: activeCoupon ? activeCoupon.label : '',
            couponPointsBonus: activeCoupon ? Number(activeCoupon.pointsBonus || 0) : 0,
        };
    }

    function applyCoupon(code, subtotal) {
        if (!isLoggedIn()) {
            return { ok: false, message: 'Please log in to apply reward coupons.' };
        }

        var normalized = normalizeCouponCode(code);
        var coupon = getCouponDefinition(normalized);
        var profile = getProfile();
        var validation = validateCouponForProfile(profile, normalized, coupon, subtotal);
        if (!validation.ok) {
            return { ok: false, message: validation.message };
        }

        var subtotalValue = validation.subtotal;
        var discount = validation.discount;

        profile.activeCouponCode = normalized;
        profile.activeCouponAppliedAt = Date.now();
        profile.coupons[normalized] = {
            code: normalized,
            label: coupon.label,
            firstUsedAt: profile.coupons[normalized] && profile.coupons[normalized].firstUsedAt
                ? profile.coupons[normalized].firstUsedAt
                : Date.now(),
            appliedAt: Date.now(),
        };
        saveProfile(profile);

        return {
            ok: true,
            code: normalized,
            label: coupon.label,
            discount: discount,
            pointsBonus: coupon.pointsBonus || 0,
        };
    }

    function clearCoupon() {
        if (!isLoggedIn()) {
            return;
        }

        var profile = getProfile();
        profile.activeCouponCode = '';
        profile.activeCouponAppliedAt = 0;
        saveProfile(profile);
    }

    function getReferralCode() {
        return getProfile().referralCode;
    }

    function claimReferralCode(code) {
        if (!isLoggedIn()) {
            return { ok: false, message: 'Please log in to claim referral rewards.' };
        }

        var normalized = String(code || '').trim().toUpperCase();
        if (!normalized) {
            return { ok: false, message: 'Please enter a referral code.' };
        }

        var profile = getProfile();
        if (normalized === profile.referralCode) {
            return { ok: false, message: 'You cannot use your own referral code.' };
        }

        if (profile.claimedReferralCodes.indexOf(normalized) !== -1) {
            return { ok: false, message: 'This referral code was already used.' };
        }

        profile.claimedReferralCodes.push(normalized);
        profile.points += 80;
        profile.lastReferralCode = normalized;
        saveProfile(profile);

        return { ok: true, points: 80, message: 'Referral reward unlocked: 80 bonus points.' };
    }

    function setBirthday(dateString) {
        if (!isLoggedIn()) {
            return { ok: false, message: 'Please log in to save your birthday reward.' };
        }

        var profile = getProfile();
        var normalized = normalizeDateString(dateString);
        if (!normalized) {
            return { ok: false, message: 'Please choose your birthday.' };
        }

        profile.birthday = normalized;
        saveProfile(profile);
        return { ok: true, message: 'Birthday saved.' };
    }

    function checkBirthdayBonus() {
        if (!isLoggedIn()) {
            return null;
        }

        var profile = getProfile();
        if (!profile.birthday) {
            return null;
        }

        var birthday = new Date(profile.birthday);
        if (Number.isNaN(birthday.getTime())) {
            return null;
        }

        var today = new Date();
        var sameMonth = birthday.getMonth() === today.getMonth();
        var sameDay = birthday.getDate() === today.getDate();
        if (!sameMonth || !sameDay) {
            return null;
        }

        if (profile.birthdayBonusYear === today.getFullYear()) {
            return { claimed: true, message: 'Birthday bonus already claimed this year.' };
        }

        profile.points += 100;
        profile.birthdayBonusYear = today.getFullYear();
        profile.lastBonusReason = 'birthday';
        saveProfile(profile);

        return { claimed: true, points: 100, message: 'Happy birthday! You earned 100 bonus points.' };
    }

    function spinDailyReward() {
        if (!isLoggedIn()) {
            return { ok: false, message: 'Please log in to spin daily rewards.' };
        }

        var profile = getProfile();
        var todayKey = getTodayKey();
        if (profile.spinDate === todayKey) {
            return { ok: false, message: 'You already spun today. Come back tomorrow.' };
        }

        var reward = DAILY_SPIN_REWARDS[Math.floor(Math.random() * DAILY_SPIN_REWARDS.length)];
        profile.spinDate = todayKey;
        profile.spinRewardLabel = reward.label;

        if (reward.type === 'points') {
            profile.points += reward.value;
        } else if (reward.type === 'coupon') {
            profile.activeCouponCode = reward.code;
            profile.activeCouponAppliedAt = Date.now();
            profile.coupons[reward.code] = {
                code: reward.code,
                label: getCouponDefinition(reward.code).label,
                appliedAt: Date.now(),
            };
        }

        saveProfile(profile);

        return { ok: true, reward: reward };
    }

    function updateText(selector, value) {
        var nodes = document.querySelectorAll(selector);
        nodes.forEach(function (node) {
            node.textContent = value;
        });
    }

    function updateProgressBar(selector, points) {
        var nodes = document.querySelectorAll(selector);
        nodes.forEach(function (node) {
            var nextTier = getNextTier(points);
            var maxPoints = nextTier ? nextTier.min : 1200;
            var previousTier = tiers[0];

            for (var i = 0; i < tiers.length; i += 1) {
                if (points >= tiers[i].min) {
                    previousTier = tiers[i];
                }
            }

            var span = maxPoints - previousTier.min || 1;
            var progress = nextTier ? Math.min(100, ((points - previousTier.min) / span) * 100) : 100;
            node.style.width = progress + '%';
        });
    }

    function renderWidgets() {
        var profile = getProfile();
        var tier = getTier(profile.points);
        var nextTier = getNextTier(profile.points);
        var remaining = nextTier ? Math.max(0, nextTier.min - profile.points) : 0;
        var activeCoupon = getActiveCoupon(profile);
        var birthdayBonus = checkBirthdayBonus();
        if (birthdayBonus && birthdayBonus.points) {
            profile = getProfile();
            tier = getTier(profile.points);
            nextTier = getNextTier(profile.points);
            remaining = nextTier ? Math.max(0, nextTier.min - profile.points) : 0;
            activeCoupon = getActiveCoupon(profile);
        }

        updateText('[data-loyalty-points]', profile.points.toString());
        updateText('[data-loyalty-orders]', profile.orders.toString());
        updateText('[data-loyalty-tier]', tier.name);
        updateText('[data-loyalty-perks]', tier.perks);
        updateText('[data-loyalty-next-tier]', nextTier ? nextTier.name : 'Legend');
        updateText('[data-loyalty-remaining]', nextTier ? remaining.toString() : '0');
        updateText('[data-loyalty-summary]', profile.points + ' pts • ' + tier.name);
        updateText('[data-loyalty-referral-code]', getReferralCode());
        updateText('[data-loyalty-spin-status]', profile.spinRewardLabel || 'Spin daily for bonuses.');
        updateText('[data-loyalty-birthday-status]', profile.birthday ? ('Birthday saved: ' + profile.birthday) : 'Add your birthday for a surprise bonus.');
        updateText('[data-loyalty-coupon-status]', activeCoupon ? activeCoupon.label : 'No coupon active yet.');
        updateText('[data-loyalty-coupon-code]', activeCoupon ? activeCoupon.code : 'NONE');
        updateText('[data-loyalty-coupon-savings]', activeCoupon ? activeCoupon.label : 'Apply a code to unlock savings.');
        updateText('[data-loyalty-referral-status]', profile.claimedReferralCodes.length ? 'Referral rewards claimed: ' + profile.claimedReferralCodes.length : 'Use a friend referral code for bonus points.');
        updateProgressBar('[data-loyalty-progress]', profile.points);

        var newCustomerCouponNodes = document.querySelectorAll('[data-coupon-code="NEW10"]');
        newCustomerCouponNodes.forEach(function (node) {
            var hideNewCustomerOffer = hasCouponBeenUsed(profile, 'NEW10') || Number(profile.orders || 0) > 0;
            node.hidden = hideNewCustomerOffer;
        });
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }

        var temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        return Promise.resolve();
    }

    function getSubtotalFromOrderSummary() {
        var subtotalNode = document.getElementById('order-subtotal');
        return subtotalNode ? Number(String(subtotalNode.textContent || '').replace(/[^0-9]/g, '')) : 0;
    }

    function bindControl(selector, handler) {
        document.querySelectorAll(selector).forEach(function (node) {
            if (node.dataset.loyaltyBound === 'true') {
                return;
            }

            node.dataset.loyaltyBound = 'true';
            node.addEventListener('click', function (event) {
                event.preventDefault();
                handler(node);
            });
        });
    }

    function bindInputControl(selector, handler) {
        document.querySelectorAll(selector).forEach(function (node) {
            if (node.dataset.loyaltyBound === 'true') {
                return;
            }

            node.dataset.loyaltyBound = 'true';
            node.addEventListener('change', function () {
                handler(node);
            });
        });
    }

    function attachActionControls() {
        bindControl('#spin-reward-btn', function (button) {
            if (!ensureLoggedIn('Please log in to claim spin rewards.')) {
                return;
            }

            var result = spinDailyReward();
            if (!result.ok) {
                notify(result.message, 'error');
                return;
            }

            notify('Reward unlocked: ' + result.reward.label, 'success');
            renderWidgets();
        });

        bindControl('#copy-referral-btn', function () {
            if (!ensureLoggedIn('Please log in to access your referral code.')) {
                return;
            }

            var code = getReferralCode();
            copyText(code).then(function () {
                notify('Referral code copied: ' + code, 'success');
            });
        });

        bindControl('#birthday-save-btn', function () {
            if (!ensureLoggedIn('Please log in to save your birthday reward.')) {
                return;
            }

            var input = document.getElementById('birthday-input');
            var result = setBirthday(input ? input.value : '');
            notify(result.message, result.ok ? 'success' : 'error');
            renderWidgets();
        });

        bindControl('#coupon-apply-btn', function () {
            if (!ensureLoggedIn('Please log in to apply coupons.')) {
                return;
            }

            var input = document.getElementById('coupon-input');
            var subtotalValue = getSubtotalFromOrderSummary();
            var result = applyCoupon(input ? input.value : '', subtotalValue);
            notify(result.message || (result.ok ? 'Coupon applied.' : 'Could not apply coupon.'), result.ok ? 'success' : 'error');
            renderWidgets();
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('la-pizzeriaa-loyalty-updated'));
            }
        });

        bindControl('#coupon-auto-btn', function () {
            if (!ensureLoggedIn('Please log in to apply coupons.')) {
                return;
            }

            var subtotalValue = getSubtotalFromOrderSummary();
            var best = getBestCouponForSubtotal(subtotalValue);

            if (!best) {
                notify('No eligible coupon found for this order amount yet.', 'error');
                return;
            }

            var input = document.getElementById('coupon-input');
            if (input) {
                input.value = best.code;
            }

            var result = applyCoupon(best.code, subtotalValue);
            notify(result.message || ('Best offer applied: ' + best.code + '.'), result.ok ? 'success' : 'error');
            renderWidgets();
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('la-pizzeriaa-loyalty-updated'));
            }
        });

        bindControl('[data-coupon-code]', function (button) {
            if (!ensureLoggedIn('Please log in to apply coupons.')) {
                return;
            }

            var code = normalizeCouponCode(button.getAttribute('data-coupon-code'));
            var input = document.getElementById('coupon-input');
            if (input) {
                input.value = code;
            }

            var subtotalValue = getSubtotalFromOrderSummary();
            var result = applyCoupon(code, subtotalValue);
            notify(result.message || (result.ok ? 'Coupon applied.' : 'Could not apply coupon.'), result.ok ? 'success' : 'error');
            renderWidgets();
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('la-pizzeriaa-loyalty-updated'));
            }
        });

        bindControl('#referral-apply-btn', function () {
            if (!ensureLoggedIn('Please log in to claim referral rewards.')) {
                return;
            }

            var input = document.getElementById('referral-input');
            var result = claimReferralCode(input ? input.value : '');
            notify(result.message, result.ok ? 'success' : 'error');
            renderWidgets();
        });

        bindInputControl('#birthday-input', function () {
            var statusNodes = document.querySelectorAll('[data-loyalty-birthday-status]');
            statusNodes.forEach(function (node) {
                node.textContent = 'Birthday selected. Save it to unlock your offer.';
            });
        });
    }

    window.LaPizzeriaaRewards = {
        getProfile: getProfile,
        addPoints: addPoints,
        getTier: getTier,
        awardBonusPoints: awardBonusPoints,
        getCheckoutTotals: getCheckoutTotals,
        applyCoupon: applyCoupon,
        clearCoupon: clearCoupon,
        getReferralCode: getReferralCode,
        claimReferralCode: claimReferralCode,
        setBirthday: setBirthday,
        spinDailyReward: spinDailyReward,
        checkBirthdayBonus: checkBirthdayBonus,
        render: renderWidgets,
    };

    window.addEventListener('la-pizzeriaa-loyalty-updated', renderWidgets);
    window.addEventListener('la-pizzeriaa-auth-updated', renderWidgets);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            renderWidgets();
            attachActionControls();
        });
    } else {
        renderWidgets();
        attachActionControls();
    }
})();