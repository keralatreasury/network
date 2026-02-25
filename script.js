   // ----- identical logic from original script.js, with padding reduced -----
        const SPREADSHEET_ID = '1jd1xZe9x2mrZm5KAwGT12vMNYjbrnynsmelNKeK95jc';
        const API_KEY = 'AIzaSyBB1V3vJpNZ9X1GIF-YOwoa6YSt_iXMLo0';
        const MENU_SHEET = 'Menu';
        const ICON_SHEET = 'icons';
        const MENU_RANGE = 'A:D';
        const ICON_RANGE = 'A:F';
        let menuData = [];
        let iconData = new Map();

        function initTheme() {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                document.body.className = savedTheme;
                document.getElementById('theme-toggle').checked = savedTheme === 'dark-theme';
            } else {
                document.body.className = prefersDark ? 'dark-theme' : 'light-theme';
                document.getElementById('theme-toggle').checked = prefersDark;
            }
        }
        function toggleTheme() {
            const isDark = document.body.classList.contains('dark-theme');
            const newTheme = isDark ? 'light-theme' : 'dark-theme';
            document.body.className = newTheme;
            localStorage.setItem('theme', newTheme);
        }

        function processIconData(rows) {
            if (!rows || rows.length < 2) return;
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 6) continue;
                const [mainMenu, mainIcon, subMenu, subIcon, linkItem, linkIcon] = row;
                if (mainMenu && subMenu && linkItem) {
                    const key = `${mainMenu}|${subMenu}|${linkItem}`;
                    iconData.set(key, {
                        mainIcon: mainIcon || '<i class="bi bi-folder2"></i>',
                        subIcon: subIcon || '<i class="bi bi-folder2"></i>',
                        linkIcon: linkIcon || '<i class="bi bi-link-45deg"></i>'
                    });
                    const mainKey = `${mainMenu}||`;
                    if (!iconData.has(mainKey)) iconData.set(mainKey, { mainIcon: mainIcon || '<i class="bi bi-grid"></i>' });
                    const subKey = `${mainMenu}|${subMenu}|`;
                    if (!iconData.has(subKey)) iconData.set(subKey, { subIcon: subIcon || '<i class="bi bi-folder"></i>' });
                }
            }
        }
        function getIcon(mainMenu, subMenu = '', linkItem = '', level) {
            const key = `${mainMenu}|${subMenu}|${linkItem}`;
            const icons = iconData.get(key);
            if (icons) {
                switch (level) {
                    case 'main': return icons.mainIcon || '<i class="bi bi-grid"></i>';
                    case 'sub': return icons.subIcon || '<i class="bi bi-folder"></i>';
                    case 'link': return icons.linkIcon || '<i class="bi bi-link-45deg"></i>';
                }
            }
            if (level === 'main') {
                const mainKey = `${mainMenu}||`;
                const mainIcons = iconData.get(mainKey);
                if (mainIcons && mainIcons.mainIcon) return mainIcons.mainIcon;
            }
            if (level === 'sub') {
                const subKey = `${mainMenu}|${subMenu}|`;
                const subIcons = iconData.get(subKey);
                if (subIcons && subIcons.subIcon) return subIcons.subIcon;
            }
            switch (level) {
                case 'main': return '<i class="bi bi-grid"></i>';
                case 'sub': return '<i class="bi bi-folder"></i>';
                case 'link': return '<i class="bi bi-link-45deg"></i>';
                default: return '<i class="bi bi-folder2"></i>';
            }
        }
        function processMenuData(rows) {
            if (!rows || rows.length < 2) return [];
            const menuMap = new Map();
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 4) continue;
                const [mainMenu, subMenu, linkItem, url] = row;
                if (!mainMenu || !subMenu || !linkItem || !url) continue;
                if (!menuMap.has(mainMenu)) menuMap.set(mainMenu, new Map());
                const subMenuMap = menuMap.get(mainMenu);
                if (!subMenuMap.has(subMenu)) subMenuMap.set(subMenu, []);
                subMenuMap.get(subMenu).push({
                    title: linkItem,
                    url: url,
                    icon: getIcon(mainMenu, subMenu, linkItem, 'link')
                });
            }
            return Array.from(menuMap.entries()).map(([mainMenu, subMenuMap]) => ({
                title: mainMenu,
                icon: getIcon(mainMenu, '', '', 'main'),
                subMenus: Array.from(subMenuMap.entries()).map(([subMenu, items]) => ({
                    title: subMenu,
                    icon: getIcon(mainMenu, subMenu, '', 'sub'),
                    items: items
                }))
            }));
        }

        async function fetchSheetData() {
            try {
                const menuUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${MENU_SHEET}!${MENU_RANGE}?key=${API_KEY}`;
                const menuResponse = await fetch(menuUrl);
                const menuData_raw = await menuResponse.json();
                if (menuData_raw.error) throw new Error(menuData_raw.error.message);
                const iconUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${ICON_SHEET}!${ICON_RANGE}?key=${API_KEY}`;
                const iconResponse = await fetch(iconUrl);
                const iconData_raw = await iconResponse.json();
                if (!iconData_raw.error) processIconData(iconData_raw.values);
                return processMenuData(menuData_raw.values);
            } catch (error) {
                console.error('Error fetching data:', error);
                showError('Error loading menu: ' + error.message);
                return [];
            }
        }

        function showError(message) {
            const desktop = document.getElementById('desktopSidebar');
            const mobile = document.getElementById('mobileSidebar');
            if (desktop) desktop.innerHTML = `<div class="error-message">${message}</div>`;
            if (mobile) mobile.innerHTML = `<div class="error-message">${message}</div>`;
        }

        function renderMenuCards(menuData, containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            if (!menuData || menuData.length === 0) {
                container.innerHTML = '<div class="text-muted p-2">No menu items</div>';
                return;
            }
            let html = '';
            menuData.forEach(main => {
                let subHtml = '';
                main.subMenus.forEach(sub => {
                    let linksHtml = '';
                    sub.items.forEach(link => {
                        linksHtml += `<li class="link-item" data-url="${link.url}">${link.icon} ${link.title}</li>`;
                    });
                    subHtml += `<div class="submenu-block">
                        <div class="submenu-title">${sub.icon} ${sub.title}</div>
                        <ul class="link-items">${linksHtml}</ul>
                    </div>`;
                });
                html += `<div class="menu-card">
                    <div class="menu-card-header">${main.icon} ${main.title}</div>
                    <div class="menu-card-body">${subHtml}</div>
                </div>`;
            });
            container.innerHTML = html;
            container.querySelectorAll('.link-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    const url = el.dataset.url;
                    loadUrlInIframe(url);
                    if (window.innerWidth < 992) {
                        const offcanvasEl = document.getElementById('mobileMenuOffcanvas');
                        const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
                        if (bsOffcanvas) bsOffcanvas.hide();
                    }
                });
            });
        }

        function loadUrlInIframe(url) {
            const iframe = document.getElementById('content-frame');
            const loading = document.getElementById('loading');
            const welcomeMessage = document.getElementById('welcome-message');
            welcomeMessage.style.display = 'none';
            loading.style.display = 'flex';
            let fullUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) fullUrl = 'https://' + url;
            iframe.onload = function () { loading.style.display = 'none'; };
            iframe.onerror = function () { loading.style.display = 'none'; alert('Error loading page: ' + fullUrl); };
            iframe.src = fullUrl;
        }

        // desktop sidebar toggle using the hamburger next to brand
        function initDesktopSidebarToggle() {
            const btn = document.getElementById('desktopSidebarToggle');
            const sidebar = document.getElementById('desktopSidebarContainer');
            if (!btn || !sidebar) return;
            btn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        async function init() {
            initTheme();
            document.getElementById('theme-toggle').addEventListener('change', toggleTheme);
            menuData = await fetchSheetData();
            renderMenuCards(menuData, 'desktopSidebar');
            renderMenuCards(menuData, 'mobileSidebar');
            document.getElementById('welcome-message').style.display = 'block';
            document.getElementById('loading').style.display = 'none';
            initDesktopSidebarToggle();
        }

        init();
        document.getElementById('content-frame').addEventListener('load', function() {
            document.getElementById('loading').style.display = 'none';
        });