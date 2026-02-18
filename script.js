        // Configuration
        const SPREADSHEET_ID = '1jd1xZe9x2mrZm5KAwGT12vMNYjbrnynsmelNKeK95jc';
        const API_KEY = 'AIzaSyBB1V3vJpNZ9X1GIF-YOwoa6YSt_iXMLo0';
        const MENU_SHEET = 'Menu';
        const ICON_SHEET = 'icons';
        const MENU_RANGE = 'A:D';
        const ICON_RANGE = 'A:F';

        // Data storage
        let menuData = [];
        let iconData = new Map(); // Key: "mainMenu|subMenu|linkItem" -> icon

        // Theme management
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

        // Fetch data from Google Sheets
        async function fetchSheetData() {
            try {
                // Fetch menu data
                const menuUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${MENU_SHEET}!${MENU_RANGE}?key=${API_KEY}`;
                const menuResponse = await fetch(menuUrl);
                const menuData_raw = await menuResponse.json();

                if (menuData_raw.error) {
                    throw new Error(menuData_raw.error.message);
                }

                // Fetch icon data
                const iconUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${ICON_SHEET}!${ICON_RANGE}?key=${API_KEY}`;
                const iconResponse = await fetch(iconUrl);
                const iconData_raw = await iconResponse.json();

                if (!iconData_raw.error) {
                    processIconData(iconData_raw.values);
                }

                return processMenuData(menuData_raw.values);
            } catch (error) {
                console.error('Error fetching data:', error);
                showError('Error loading menu: ' + error.message);
                return [];
            }
        }

        // Process icon data
        function processIconData(rows) {
            if (!rows || rows.length < 2) return;

            // Skip header row
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 6) continue;

                const [mainMenu, mainIcon, subMenu, subIcon, linkItem, linkIcon] = row;
                
                if (mainMenu && subMenu && linkItem) {
                    const key = `${mainMenu}|${subMenu}|${linkItem}`;
                    
                    // Store icons for each level
                    iconData.set(key, {
                        mainIcon: mainIcon || '<i class="bi bi-folder2"></i>',
                        subIcon: subIcon || '<i class="bi bi-folder2"></i>',
                        linkIcon: linkIcon || '<i class="bi bi-link-45deg"></i>'
                    });
                    
                    // Also store for main menu level (without submenu and link item)
                    const mainKey = `${mainMenu}||`;
                    if (!iconData.has(mainKey)) {
                        iconData.set(mainKey, {
                            mainIcon: mainIcon || '<i class="bi bi-grid"></i>'
                        });
                    }
                    
                    // Store for submenu level (with main menu and submenu only)
                    const subKey = `${mainMenu}|${subMenu}|`;
                    if (!iconData.has(subKey)) {
                        iconData.set(subKey, {
                            subIcon: subIcon || '<i class="bi bi-folder"></i>'
                        });
                    }
                }
            }
        }

        // Get icon for menu item
        function getIcon(mainMenu, subMenu = '', linkItem = '', level) {
            const key = `${mainMenu}|${subMenu}|${linkItem}`;
            const icons = iconData.get(key);
            
            if (icons) {
                switch(level) {
                    case 'main': return icons.mainIcon || '<i class="bi bi-grid"></i>';
                    case 'sub': return icons.subIcon || '<i class="bi bi-folder"></i>';
                    case 'link': return icons.linkIcon || '<i class="bi bi-link-45deg"></i>';
                }
            }
            
            // Try to find icon for this specific level
            if (level === 'main') {
                const mainKey = `${mainMenu}||`;
                const mainIcons = iconData.get(mainKey);
                if (mainIcons && mainIcons.mainIcon) {
                    return mainIcons.mainIcon;
                }
            }
            
            if (level === 'sub') {
                const subKey = `${mainMenu}|${subMenu}|`;
                const subIcons = iconData.get(subKey);
                if (subIcons && subIcons.subIcon) {
                    return subIcons.subIcon;
                }
            }
            
            // Default icons based on level
            switch(level) {
                case 'main': return '<i class="bi bi-grid"></i>';
                case 'sub': return '<i class="bi bi-folder"></i>';
                case 'link': return '<i class="bi bi-link-45deg"></i>';
                default: return '<i class="bi bi-folder2"></i>';
            }
        }

        // Process menu data
        function processMenuData(rows) {
            if (!rows || rows.length < 2) return [];

            const menuMap = new Map();

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 4) continue;

                const [mainMenu, subMenu, linkItem, url] = row;

                if (!mainMenu || !subMenu || !linkItem || !url) continue;

                if (!menuMap.has(mainMenu)) {
                    menuMap.set(mainMenu, new Map());
                }

                const subMenuMap = menuMap.get(mainMenu);
                
                if (!subMenuMap.has(subMenu)) {
                    subMenuMap.set(subMenu, []);
                }

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

        // Render desktop menu
        function renderDesktopMenu(menuData) {
            const container = document.getElementById('desktop-menu-container');
            
            if (menuData.length === 0) {
                container.innerHTML = '<div class="text-muted p-3">No menu items found</div>';
                return;
            }

            const navMenu = document.createElement('div');
            navMenu.className = 'nav-menu';

            menuData.forEach((mainItem, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'nav-item-custom';
                const dropdownId = `dropdown-${index}`;

                const mainLink = document.createElement('a');
                mainLink.className = 'nav-link-custom';
                mainLink.href = '#';
                
                // Add icon and title
                const iconSpan = document.createElement('span');
                iconSpan.innerHTML = mainItem.icon;
                mainLink.appendChild(iconSpan);
                mainLink.appendChild(document.createTextNode(mainItem.title));
                
                // Add chevron
                const chevron = document.createElement('i');
                chevron.className = 'bi bi-chevron-down chevron-icon';
                mainLink.appendChild(chevron);

                if (mainItem.subMenus.length > 0) {
                    const dropdown = document.createElement('div');
                    dropdown.className = 'dropdown-menu-custom';
                    dropdown.id = dropdownId;

                    mainItem.subMenus.forEach(subMenu => {
                        const header = document.createElement('div');
                        header.className = 'dropdown-header-custom';
                        
                        const headerIcon = document.createElement('span');
                        headerIcon.innerHTML = subMenu.icon;
                        header.appendChild(headerIcon);
                        header.appendChild(document.createTextNode(subMenu.title));
                        dropdown.appendChild(header);

                        subMenu.items.forEach(item => {
                            const itemLink = document.createElement('a');
                            itemLink.className = 'dropdown-item-custom';
                            itemLink.href = '#';
                            
                            const itemIcon = document.createElement('span');
                            itemIcon.innerHTML = item.icon;
                            itemLink.appendChild(itemIcon);
                            itemLink.appendChild(document.createTextNode(item.title));
                            
                            itemLink.addEventListener('click', (e) => {
                                e.preventDefault();
                                loadUrlInIframe(item.url);
                                closeAllDropdowns();
                            });
                            
                            dropdown.appendChild(itemLink);
                        });
                    });

                    itemDiv.appendChild(dropdown);
                    
                    mainLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        toggleDropdown(dropdownId, itemDiv);
                    });
                }

                itemDiv.appendChild(mainLink);
                navMenu.appendChild(itemDiv);
            });

            container.innerHTML = '';
            container.appendChild(navMenu);
        }

        // Render mobile menu
        function renderMobileMenu(menuData) {
            const container = document.getElementById('mobile-menu-container');
            
            if (menuData.length === 0) {
                container.innerHTML = '<div class="text-muted p-3">No menu items found</div>';
                return;
            }

            const menuDiv = document.createElement('div');
            menuDiv.className = 'py-2';

            menuData.forEach((mainItem, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'mobile-nav-item';

                const mainToggle = document.createElement('div');
                mainToggle.className = 'mobile-nav-link';
                mainToggle.setAttribute('data-target', `mobile-submenu-${index}`);
                
                const leftSpan = document.createElement('span');
                leftSpan.innerHTML = mainItem.icon + ' ' + mainItem.title;
                mainToggle.appendChild(leftSpan);
                
                const chevron = document.createElement('i');
                chevron.className = 'bi bi-chevron-down';
                mainToggle.appendChild(chevron);

                itemDiv.appendChild(mainToggle);

                const submenu = document.createElement('ul');
                submenu.className = 'mobile-submenu';
                submenu.id = `mobile-submenu-${index}`;

                mainItem.subMenus.forEach(subMenu => {
                    const headerLi = document.createElement('li');
                    headerLi.className = 'mobile-submenu-header';
                    headerLi.innerHTML = subMenu.icon + ' ' + subMenu.title;
                    submenu.appendChild(headerLi);

                    subMenu.items.forEach(item => {
                        const itemLi = document.createElement('li');
                        itemLi.className = 'mobile-submenu-item';

                        const itemLink = document.createElement('a');
                        itemLink.className = 'mobile-submenu-link';
                        itemLink.href = '#';
                        itemLink.innerHTML = item.icon + ' ' + item.title;
                        
                        itemLink.addEventListener('click', (e) => {
                            e.preventDefault();
                            loadUrlInIframe(item.url);
                            const navbarCollapse = document.getElementById('navbarMain');
                            if (navbarCollapse.classList.contains('show')) {
                                navbarCollapse.classList.remove('show');
                            }
                        });

                        itemLi.appendChild(itemLink);
                        submenu.appendChild(itemLi);
                    });
                });

                itemDiv.appendChild(submenu);
                menuDiv.appendChild(itemDiv);

                mainToggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('data-target');
                    const targetSubmenu = document.getElementById(targetId);
                    const icon = this.querySelector('i:last-child');
                    
                    targetSubmenu.classList.toggle('show');
                    if (icon) {
                        icon.classList.toggle('bi-chevron-down');
                        icon.classList.toggle('bi-chevron-up');
                    }
                    
                    document.querySelectorAll('.mobile-submenu').forEach(menu => {
                        if (menu.id !== targetId && menu.classList.contains('show')) {
                            menu.classList.remove('show');
                            const otherIcon = document.querySelector(`[data-target="${menu.id}"] i:last-child`);
                            if (otherIcon) {
                                otherIcon.classList.remove('bi-chevron-up');
                                otherIcon.classList.add('bi-chevron-down');
                            }
                        }
                    });
                });
            });

            container.innerHTML = '';
            container.appendChild(menuDiv);
        }

        // Dropdown management
        let currentOpenDropdown = null;

        function closeAllDropdowns() {
            document.querySelectorAll('.dropdown-menu-custom.show').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
            document.querySelectorAll('.nav-item-custom.active').forEach(item => {
                item.classList.remove('active');
            });
            currentOpenDropdown = null;
        }

        function handleClickOutside(event) {
            if (!event.target.closest('.nav-item-custom')) {
                closeAllDropdowns();
            }
        }

        function toggleDropdown(dropdownId, navItem) {
            const dropdown = document.getElementById(dropdownId);
            
            if (currentOpenDropdown === dropdownId) {
                closeAllDropdowns();
                return;
            }
            
            closeAllDropdowns();
            
            dropdown.classList.add('show');
            navItem.classList.add('active');
            currentOpenDropdown = dropdownId;
        }

        // Load URL in iframe
        function loadUrlInIframe(url) {
            const iframe = document.getElementById('content-frame');
            const loading = document.getElementById('loading');
            const welcomeMessage = document.getElementById('welcome-message');
            
            welcomeMessage.style.display = 'none';
            loading.style.display = 'flex';
            
            let fullUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                fullUrl = 'https://' + url;
            }

            iframe.onload = function() {
                loading.style.display = 'none';
            };
            
            iframe.onerror = function() {
                loading.style.display = 'none';
                alert('Error loading the page. Please check the URL: ' + fullUrl);
            };

            iframe.src = fullUrl;
        }

        // Show error message
        function showError(message) {
            const desktopContainer = document.getElementById('desktop-menu-container');
            const mobileContainer = document.getElementById('mobile-menu-container');
            const errorHtml = `<div class="error-message">${message}</div>`;
            desktopContainer.innerHTML = errorHtml;
            mobileContainer.innerHTML = errorHtml;
        }

        // Initialize
        async function init() {
            initTheme();
            
            document.getElementById('theme-toggle').addEventListener('change', toggleTheme);
            
            menuData = await fetchSheetData();
            renderDesktopMenu(menuData);
            renderMobileMenu(menuData);
            
            document.addEventListener('click', handleClickOutside);
            
            document.getElementById('welcome-message').style.display = 'block';
            document.getElementById('loading').style.display = 'none';
        }

        // Start
        init();

        // Iframe load handler
        document.getElementById('content-frame').addEventListener('load', function() {
            document.getElementById('loading').style.display = 'none';
        });
