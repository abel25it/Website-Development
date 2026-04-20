(function () {
    var AUTH_KEY = 'la-pizzeriaa-auth';
    var OTP_KEY = 'la-pizzeriaa-auth-pending-otp';
    var NOTICE_KEY = 'la-pizzeriaa-site-notice';
    var SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    var IDLE_TTL_MS = 30 * 60 * 1000;
    var OTP_TTL_MS = 5 * 60 * 1000;
    var noticeContainer = null;

    function now() {
        return Date.now();
    }

    function clearPendingOtp() {
        window.localStorage.removeItem(OTP_KEY);
    }

    function queueNotice(message, type) {
        if (!message) {
            return;
        }

        try {
            window.sessionStorage.setItem(NOTICE_KEY, JSON.stringify({
                message: String(message),
                type: type || 'info',
                createdAt: now(),
            }));
        } catch (error) {
            // Ignore storage errors and continue without queued notice.
        }
    }

    function getQueuedNotice() {
        try {
            var raw = window.sessionStorage.getItem(NOTICE_KEY);
            if (!raw) {
                return null;
            }

            window.sessionStorage.removeItem(NOTICE_KEY);
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.message) {
                return null;
            }
            return parsed;
        } catch (error) {
            return null;
        }
    }

    function getNoticeContainer() {
        if (noticeContainer && document.body.contains(noticeContainer)) {
            return noticeContainer;
        }

        noticeContainer = document.querySelector('.site-toast-container');
        if (noticeContainer) {
            return noticeContainer;
        }

        noticeContainer = document.createElement('div');
        noticeContainer.className = 'site-toast-container';
        noticeContainer.setAttribute('aria-live', 'polite');
        noticeContainer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(noticeContainer);
        return noticeContainer;
    }

    function showNotice(message, type) {
        if (!message) {
            return;
        }

        var container = getNoticeContainer();
        var toast = document.createElement('p');
        var tone = type || 'info';

        toast.className = 'site-toast site-toast-' + tone;
        toast.textContent = String(message);
        container.appendChild(toast);

        window.requestAnimationFrame(function () {
            toast.classList.add('show');
        });

        window.setTimeout(function () {
            toast.classList.remove('show');
            window.setTimeout(function () {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 240);
        }, 2800);
    }

    function getPendingOtp() {
        try {
            var data = JSON.parse(window.localStorage.getItem(OTP_KEY) || 'null');
            if (!data || !data.phone || !data.otp || !data.expiresAt) {
                return null;
            }
            if (now() > Number(data.expiresAt || 0)) {
                clearPendingOtp();
                return null;
            }
            return data;
        } catch (error) {
            clearPendingOtp();
            return null;
        }
    }

    function sanitizePhone(value) {
        return String(value || '').replace(/\D/g, '').slice(0, 15);
    }

    function getAuth() {
        try {
            var data = JSON.parse(window.localStorage.getItem(AUTH_KEY) || 'null');
            if (!data || !data.phone) {
                return null;
            }

            var timeNow = now();
            var sessionExpiresAt = Number(data.sessionExpiresAt || 0);
            var lastActiveAt = Number(data.lastActiveAt || 0);

            if (!sessionExpiresAt || !lastActiveAt || timeNow > sessionExpiresAt || (timeNow - lastActiveAt) > IDLE_TTL_MS) {
                window.localStorage.removeItem(AUTH_KEY);
                return null;
            }

            return data;
        } catch (error) {
            window.localStorage.removeItem(AUTH_KEY);
            return null;
        }
    }

    function isLoggedIn() {
        return !!getAuth();
    }

    function touchSession() {
        var auth = getAuth();
        if (!auth) {
            return;
        }

        auth.lastActiveAt = now();
        window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    }

    function login(payload) {
        var phone = sanitizePhone(payload && payload.phone);
        var name = String((payload && payload.name) || '').trim() || 'Guest';

        if (!phone) {
            return { ok: false, message: 'Phone number is required.' };
        }

        var timeNow = now();
        var next = {
            name: name,
            phone: phone,
            loggedInAt: timeNow,
            lastActiveAt: timeNow,
            sessionExpiresAt: timeNow + SESSION_TTL_MS,
        };

        window.localStorage.setItem(AUTH_KEY, JSON.stringify(next));
        clearPendingOtp();
        window.dispatchEvent(new Event('la-pizzeriaa-auth-updated'));
        return { ok: true, user: next };
    }

    function requestOtp(payload) {
        var phone = sanitizePhone(payload && payload.phone);
        var name = String((payload && payload.name) || '').trim() || 'Guest';

        if (!phone) {
            return { ok: false, message: 'Enter a valid phone number.' };
        }

        var otp = String(Math.floor(100000 + Math.random() * 900000));
        var pending = {
            name: name,
            phone: phone,
            otp: otp,
            createdAt: now(),
            expiresAt: now() + OTP_TTL_MS,
        };

        window.localStorage.setItem(OTP_KEY, JSON.stringify(pending));
        return {
            ok: true,
            otp: otp,
            message: 'OTP generated. For demo, use this OTP: ' + otp,
        };
    }

    function verifyOtp(payload) {
        var pending = getPendingOtp();
        if (!pending) {
            return { ok: false, message: 'OTP expired. Please request a new OTP.' };
        }

        var phone = sanitizePhone(payload && payload.phone);
        var otp = String((payload && payload.otp) || '').trim();

        if (!phone || phone !== pending.phone) {
            return { ok: false, message: 'Phone number does not match OTP request.' };
        }

        if (!otp || otp !== pending.otp) {
            return { ok: false, message: 'Invalid OTP. Please try again.' };
        }

        return login({
            name: pending.name,
            phone: pending.phone,
        });
    }

    function logout() {
        window.localStorage.removeItem(AUTH_KEY);
        clearPendingOtp();
        window.dispatchEvent(new Event('la-pizzeriaa-auth-updated'));
    }

    function getCurrentPage() {
        var parts = window.location.pathname.split('/');
        var page = parts[parts.length - 1] || 'index.html';
        return page;
    }

    function redirectToLogin(message) {
        if (message) {
            queueNotice(message, 'info');
        }

        var redirect = encodeURIComponent(getCurrentPage());
        window.location.href = 'login.html?redirect=' + redirect;
    }

    function requireLogin(message) {
        if (isLoggedIn()) {
            touchSession();
            return true;
        }

        redirectToLogin(message || 'Please log in first.');
        return false;
    }

    function getRedirectTarget() {
        try {
            var params = new URLSearchParams(window.location.search);
            var redirect = params.get('redirect');
            if (!redirect) {
                return 'index.html';
            }

            if (/^[a-zA-Z0-9_-]+\.html$/.test(redirect)) {
                return redirect;
            }

            return 'index.html';
        } catch (error) {
            return 'index.html';
        }
    }

    function mountNavAuthLink() {
        var navLists = document.querySelectorAll('.nav-links');
        if (!navLists.length) {
            return;
        }

        navLists.forEach(function (list) {
            var existing = list.querySelector('[data-auth-nav]');
            if (existing) {
                existing.remove();
            }

            var li = document.createElement('li');
            li.setAttribute('data-auth-nav', 'true');
            var link = document.createElement('a');
            var currentPage = getCurrentPage();

            if (isLoggedIn()) {
                link.href = '#';
                link.textContent = 'Logout';
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    logout();
                    if (currentPage === 'login.html') {
                        window.location.href = 'index.html';
                    }
                });
            } else {
                link.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
                link.textContent = 'Login';
            }

            li.appendChild(link);
            list.appendChild(li);
        });
    }

    function mountRewardsLoginState() {
        var rewardsLoginBtn = document.querySelector('[data-rewards-login-btn]');
        if (!rewardsLoginBtn) {
            return;
        }

        rewardsLoginBtn.textContent = isLoggedIn() ? 'Logined' : 'Login';
    }

    function setLoginStatus(message, isError) {
        var status = document.getElementById('login-status');
        if (!status) {
            return;
        }

        status.textContent = message || '';
        status.style.color = isError ? '#c43a17' : '';
    }

    function mountLoginForm() {
        var form = document.getElementById('login-form');
        if (!form) {
            return;
        }

        if (isLoggedIn()) {
            window.location.href = getRedirectTarget();
            return;
        }

        var nameInput = document.getElementById('login-name');
        var phoneInput = document.getElementById('login-phone');
        var otpInput = document.getElementById('login-otp');
        var otpWrap = document.getElementById('login-otp-wrap');
        var sendOtpButton = document.getElementById('send-otp-btn');

        var existingPending = getPendingOtp();
        if (existingPending && otpWrap) {
            if (phoneInput) {
                phoneInput.value = existingPending.phone;
            }
            otpWrap.hidden = false;
            setLoginStatus('OTP already sent. Enter OTP to continue.', false);
        }

        if (sendOtpButton) {
            sendOtpButton.addEventListener('click', function () {
                var result = requestOtp({
                    name: nameInput ? nameInput.value : '',
                    phone: phoneInput ? phoneInput.value : '',
                });

                if (!result.ok) {
                    setLoginStatus(result.message, true);
                    showNotice(result.message, 'error');
                    return;
                }

                if (otpWrap) {
                    otpWrap.hidden = false;
                }

                setLoginStatus('OTP sent. Use the demo OTP shown in the message.', false);
                showNotice(result.message, 'success');
            });
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var result = verifyOtp({
                phone: phoneInput ? phoneInput.value : '',
                otp: otpInput ? otpInput.value : '',
            });

            if (!result.ok) {
                setLoginStatus(result.message, true);
                showNotice(result.message, 'error');
                return;
            }

            window.location.href = getRedirectTarget();
        });
    }

    window.LaPizzeriaaAuth = {
        getAuth: getAuth,
        isLoggedIn: isLoggedIn,
        login: login,
        logout: logout,
        requireLogin: requireLogin,
        requestOtp: requestOtp,
        verifyOtp: verifyOtp,
        touchSession: touchSession,
    };

    window.LaPizzeriaaNotify = {
        show: showNotice,
        queue: queueNotice,
    };

    function init() {
        touchSession();
        mountNavAuthLink();
        mountRewardsLoginState();
        mountLoginForm();

        var queued = getQueuedNotice();
        if (queued) {
            showNotice(queued.message, queued.type || 'info');
        }
    }

    window.addEventListener('la-pizzeriaa-auth-updated', mountNavAuthLink);
    window.addEventListener('la-pizzeriaa-auth-updated', mountRewardsLoginState);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
