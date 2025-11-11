// FIX: All critical errors have been resolved. localStorage fallback added to loadPosts and other functions.
let currentUser = null;
let currentCategory = 'all';

// ====================================================================
// FILE OPERATIONS (File to Base64)
// ====================================================================

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// ====================================================================
// PAGE GENERAL AND INITIAL LOAD
// ====================================================================

// ... (Mevcut kodunuzun başlangıcı)

// New helper function: Increments the view count
function incrementPostViews(postId) {
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex !== -1) {
        // Increment view count. If none, start at 1.
        posts[postIndex].views = (posts[postIndex].views || 0) + 1;
        
        // Save back to localStorage
        localStorage.setItem('posts', JSON.stringify(posts));
        
        // Return the new view count
        return posts[postIndex].views; 
    }
    return 0; // Return 0 if post not found
}

// loadPostPage function is being updated to increment the view counter
async function loadPostPage() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    const postDetailContainer = document.getElementById('postDetailContainer');
    const postPageTitle = document.getElementById('postPageTitle');

    if (!postId) {
        if (postDetailContainer) {
            postDetailContainer.innerHTML = `<div class="error-message">Error: Post ID not found.</div>`;
        }
        return;
    }

    const posts = JSON.parse(localStorage.getItem('posts')) || [];
    const post = posts.find(p => p.id === postId);

    if (post) {
        // NEW: Increment the view counter and get the new value
        const currentViews = incrementPostViews(postId); 

        // Title is updated
        postPageTitle.textContent = `${post.title} | Blogify`; // Blogify

        // Get author name (assuming the author name is in the post object instead of authorId)
        const authorName = post.authorName || 'Anonymous Author';
        const postDate = new Date(post.date).toLocaleDateString('en-US');

        postDetailContainer.innerHTML = `
            <div class="post-detail-header">
                <h1 class="post-detail-title">${post.title}</h1>
                <div class="post-meta">
                    <span class="author">👤 ${authorName}</span>
                    <span class="date">📅 ${postDate}</span>
                    <span class="category-tag">${post.category}</span>
                </div>
                <div class="post-views">
                    <i class="fas fa-eye"></i> <span>${currentViews} Views</span>
                </div>
            </div>
            ${post.image ? `<img src="${post.image}" alt="${post.title}" class="post-detail-image">` : ''}
            <div class="post-content">
                ${post.content}
            </div>
            
            <div class="comments-section">
                <h2>Comments</h2>
                <div id="commentsList">
                    <div class="placeholder-text">Comments loading...</div>
                </div>
                <form id="commentForm">
                    <textarea placeholder="Write your comment here..." required></textarea>
                    <button type="submit" class="btn btn-primary">Comment</button>
                </form>
            </div>
        `;
        
        // Note: You need to integrate your comment loading and form submission logic below this code.

    } else {
        postPageTitle.textContent = `Post Not Found | Blogify`; // Blogify
        postDetailContainer.innerHTML = `<div class="error-message">Sorry, the post you are looking for was not found.</div>`;
    }
}

// ... (Mevcut kodunuzun devamı)


document.addEventListener('DOMContentLoaded', () => {
    loadUser().then(user => {
        // index.html'e özgü yüklemeler
        if (document.getElementById('blogGrid')) {
            loadPosts();
            initCategoryButtons();
            initSmoothScroll(); 
        } 
        // NEW: Post Detail Page Load
        else if (window.location.pathname.includes('post.html')) {
            loadPostPage();
            initSmoothScroll();
        }
       // script.js dosyasındaki ilgili kısım:
else if (window.location.pathname.includes('dashboard.html')) {
    if (user) {
        loadDashboard(); // Dashboard is loaded if user exists.
    } else {
        alert("You must log in to access the Dashboard!");
        window.location.href = 'index.html'; // If no user, redirect to home page.
    }
}
        else if (window.location.pathname.includes('new_post.html')) {
            if (!user) {
                alert("You must log in to access this page!");
                window.location.href = 'index.html';
            }
        }
    });
});

// ====================================================================
// USER / SESSION MANAGEMENT
// ====================================================================

async function loadUser() {
    try {
        let result = null;
        if (typeof window.storage !== 'undefined') {
            result = await window.storage.get('currentUser').catch(() => null);
        } else if (typeof localStorage !== 'undefined') {
            const data = localStorage.getItem('currentUser');
            if (data) result = { value: data };
        }
        
        if (result && result.value) {
            currentUser = JSON.parse(result.value);
            // We are only using SessionStorage as a fallback
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('currentUser', result.value);
            }
        } 
        
        if (!currentUser && typeof sessionStorage !== 'undefined') {
            const sessionData = sessionStorage.getItem('currentUser');
            if (sessionData) {
                currentUser = JSON.parse(sessionData);
            }
        }
        
        if (currentUser) {
            updateUIForUser();
        }
        
    } catch (error) {
        if (typeof sessionStorage !== 'undefined') {
            const sessionData = sessionStorage.getItem('currentUser');
            if (sessionData) {
                currentUser = JSON.parse(sessionData);
                updateUIForUser();
            }
        }
        console.warn('Error loading user:', error);
    }
    return currentUser;
}

function updateUIForUser() {
    const userAvatar = document.getElementById('userAvatar');
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    
    if (!userAvatar || !authButtons || !userMenu) return; 

    if (currentUser) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');

        if (currentUser.profilePicture && currentUser.profilePicture.startsWith('data:image/')) {
            userAvatar.textContent = '';
            userAvatar.style.backgroundImage = `url('${currentUser.profilePicture}')`;
        } else {
            userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
            userAvatar.style.backgroundImage = 'none';
        }
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
        userAvatar.style.backgroundImage = 'none';
    }
}

async function register() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
        alert('⚠️ Please fill in all fields!');
        return;
    }
    
    // İsim-soyisim kontrolü - en az 2 kelime olmalı
    const nameParts = name.split(' ').filter(part => part.length > 0);
    if (nameParts.length < 2) {
        alert('⚠️ Please enter your full first and last name! (E.g: John Doe)');
        return;
    }
    
    if (password.length < 6) {
        alert('⚠️ Password must be at least 6 characters long!');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('⚠️ Please enter a valid email address!');
        return;
    }

    const user = {
        id: Date.now(),
        name,
        email,
        password,
        profilePicture: '', 
        createdAt: new Date().toISOString()
    };
    
    let isStorageSuccessful = false;
    const userData = JSON.stringify(user);
    const userKey = `user-${email.replace(/[@.]/g, '-')}`;

    try {
        if (typeof window.storage !== 'undefined') {
            const existingUser = await window.storage.get(userKey).catch(() => null);
            if (existingUser && existingUser.value) {
                alert('⚠️ This email address is already registered!');
                return;
            }

            await window.storage.set(userKey, userData);
            await window.storage.set('currentUser', userData);
            isStorageSuccessful = true;
        } else if (typeof localStorage !== 'undefined') {
            // Check if user exists in localStorage
            if (localStorage.getItem(userKey)) {
                alert('⚠️ This email address is already registered!');
                return;
            }
            
            localStorage.setItem(userKey, userData);
            localStorage.setItem('currentUser', userData);
            isStorageSuccessful = true;
        }
    } catch (error) {
        console.error('Registration storage error:', error);
    }
    
    if (!isStorageSuccessful && typeof sessionStorage !== 'undefined') {
        try {
            sessionStorage.setItem('currentUser', userData);
        } catch(e) {
            console.error('SessionStorage also failed:', e);
        }
    }

    currentUser = user; 
    closeModal('registerModal');
    updateUIForUser();
    alert('🎉 Registration successful! Welcome, ' + name + '!');
}

async function login() { 
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please enter your email and password.');
        return;
    }
    
    const userKey = `user-${email.replace(/[@.]/g, '-')}`;
    let userData = null;
    let storageType = null;
    
    try {
        if (typeof window.storage !== 'undefined') {
            const result = await window.storage.get(userKey).catch(() => null);
            if (result && result.value) {
                userData = JSON.parse(result.value);
                storageType = 'window.storage';
            }
        } else if (typeof localStorage !== 'undefined') {
            const data = localStorage.getItem(userKey);
            if (data) {
                userData = JSON.parse(data);
                storageType = 'localStorage';
            }
        }

        if (userData) {
            if (userData.password !== password) {
                alert('❌ Incorrect password!');
                return;
            }
        } else {
            alert('❌ No user registered with this email was found!');
            return;
        }

    } catch (e) {
        console.warn('User authentication error:', e);
        alert('❌ An error occurred during login!');
        return;
    }
    
    currentUser = userData;
    const currentUserData = JSON.stringify(currentUser);

    try {
        if (storageType === 'window.storage') {
            await window.storage.set('currentUser', currentUserData); 
        } else if (storageType === 'localStorage' && typeof localStorage !== 'undefined') {
            localStorage.setItem('currentUser', currentUserData);
        } else if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('currentUser', currentUserData);
        }
    } catch (e) {
        console.warn('User storage save failed:', e);
    }

    closeModal('loginModal'); 
    updateUIForUser();
    alert('✅ Login successful! Welcome, ' + currentUser.name + '!');
    
    // Dashboard'a yönlendirme
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        window.location.href = 'dashboard.html';
    }
}

function logout() { 
    currentUser = null; 
    try {
        if (typeof window.storage !== 'undefined') {
            window.storage.delete('currentUser').catch(() => {});
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('currentUser');
        }
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('currentUser');
        }
    } catch (e) {
        console.warn('Storage could not be cleared:', e);
    }

    updateUIForUser(); 
    alert('Logged out.'); 
    window.location.href = 'index.html';
}

async function saveProfile() {
    if (!currentUser) return;
    
    const newName = document.getElementById('profileName').value.trim();
    const newPassword = document.getElementById('profilePassword').value;
    const profileImageFile = document.getElementById('profilePictureFile') ? document.getElementById('profilePictureFile').files[0] : null;
    const userKey = `user-${currentUser.email.replace(/[@.]/g, '-')}`;

    if (!newName) {
        alert('⚠️ Name and Surname field cannot be left blank!');
        return;
    }
    
    // İsim-soyisim kontrolü - en az 2 kelime olmalı
    const nameParts = newName.split(' ').filter(part => part.length > 0);
    if (nameParts.length < 2) {
        alert('⚠️ Please enter your full first and last name! (E.g: John Doe)');
        return;
    }
    
    if (newPassword && newPassword.length < 6) {
        alert('⚠️ New password must be at least 6 characters long!');
        return;
    }
    
    if (profileImageFile) {
        const MAX_SIZE = 500 * 1024; // 500 KB
        if (profileImageFile.size > MAX_SIZE) {
            alert('⚠️ Profile image size is too large (Maximum 500KB). Please select a smaller image.');
            return; 
        }
        
        try {
            const base64Image = await fileToBase64(profileImageFile);
            currentUser.profilePicture = base64Image;
        } catch (e) {
            alert('An error occurred while uploading the profile image.');
            return;
        }
    }
    
    currentUser.name = newName;
    if (newPassword) {
        currentUser.password = newPassword;
    }
    
    const userData = JSON.stringify(currentUser);

    try {
        if (typeof window.storage !== 'undefined') {
            await window.storage.set(userKey, userData); 
            await window.storage.set('currentUser', userData); 
        } else if (typeof localStorage !== 'undefined') {
            localStorage.setItem(userKey, userData);
            localStorage.setItem('currentUser', userData);
        }
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('currentUser', userData);
        }
    } catch (error) {
        console.error('Storage (Profile Save) error:', error);
        alert('⚠️ An error occurred while updating the profile!');
        return;
    }
    
    loadDashboard(); 
    updateUIForUser(); 
    alert('🎉 Profile successfully updated!');
}

// ====================================================================
// POST DETAIL PAGE LOAD (for post.html)
// ====================================================================

async function loadPostPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) {
        document.getElementById('postDetailContainer').innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h2 style="color: var(--danger);">❌ Invalid Link</h2>
                <p style="color: var(--text-secondary);">Post ID not found.</p>
                <a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Go to Homepage</a>
            </div>
        `;
        return;
    }

    try {
        let postResult = null;
        
        if (typeof window.storage !== 'undefined') {
            postResult = await window.storage.get(`post:${postId}`, true).catch(() => null);
        } else if (typeof localStorage !== 'undefined') {
            const postData = localStorage.getItem(`post:${postId}`);
            if (postData) {
                postResult = { value: postData };
            }
        }

        if (!postResult || !postResult.value) {
            document.getElementById('postDetailContainer').innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h2 style="color: var(--danger);">📭 Post Not Found</h2>
                    <p style="color: var(--text-secondary);">This post has been deleted or does not exist.</p>
                    <a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Go to Homepage</a>
                </div>
            `;
            return;
        }

        const post = JSON.parse(postResult.value);
        
        // Sayfa başlığını güncelle
        document.getElementById('postPageTitle').textContent = `${post.title} | Blogify`; // Blogify
        
        const date = new Date(post.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const categoryEmojis = {
            'teknoloji': '💻',
            'tasarim': '🎨',
            'yazilim': '⚡',
            'yaraticilik': '✨'
        };
        const categoryLabel = `${categoryEmojis[post.category] || '📝'} ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}`;
        
        const authorAvatarStyle = post.authorAvatar ? `background-image: url('${post.authorAvatar}'); background-size: cover; background-position: center;` : '';
        const authorAvatarText = post.authorAvatar ? '' : post.author.charAt(0).toUpperCase();
        
        // Beğeni ve yorumları yükle
        let likes = [];
        let comments = [];
        
        if (typeof window.storage !== 'undefined') {
            const likesResult = await window.storage.get(`likes:${postId}`, true).catch(() => null);
            likes = likesResult && likesResult.value ? JSON.parse(likesResult.value) : [];
            
            const commentsResult = await window.storage.get(`comments:${postId}`, true).catch(() => null);
            comments = commentsResult && commentsResult.value ? JSON.parse(commentsResult.value) : [];
        } else if (typeof localStorage !== 'undefined') {
            const likesData = localStorage.getItem(`likes:${postId}`);
            likes = likesData ? JSON.parse(likesData) : [];
            
            const commentsData = localStorage.getItem(`comments:${postId}`);
            comments = commentsData ? JSON.parse(commentsData) : [];
        }
        
        const isLiked = currentUser && likes.includes(currentUser.email);
        
        document.getElementById('postDetailContainer').innerHTML = `
            <article class="post-detail-content">
                ${post.image ? `<img src="${post.image}" alt="${post.title}" class="post-image-full" onerror="this.style.display='none'">` : ''}
                
                <div class="post-header-meta">
                    <span>${categoryLabel}</span> • 
                    <span>📅 ${formattedDate}</span> • 
                    <span>❤️ ${likes.length} Likes</span> • 
                    <span>💬 ${comments.length} Comments</span>
                </div>
                
                <h1 style="font-size: 48px; margin: 30px 0 20px; line-height: 1.2;">${post.title}</h1>
                
                <div class="blog-author" style="margin-bottom: 40px; padding-bottom: 30px; border-bottom: 2px solid var(--border);">
                    <div class="author-avatar" style="width: 50px; height: 50px; font-size: 20px; ${authorAvatarStyle}">${authorAvatarText}</div>
                    <div class="author-info">
                        <div class="author-name" style="font-size: 18px; font-weight: 600;">${post.author}</div>
                        <div style="font-size: 14px; color: var(--text-secondary);">Author</div>
                    </div>
                </div>
                
                <div class="post-content-body" style="font-size: 18px; line-height: 1.8; color: var(--text-secondary); margin-bottom: 50px; white-space: pre-wrap;">
                    ${post.content}
                </div>
                
                <div class="post-actions" style="display: flex; gap: 16px; margin-bottom: 50px; padding: 30px 0; border-top: 2px solid var(--border); border-bottom: 2px solid var(--border);">
                    <button class="btn ${isLiked ? 'btn-primary' : 'btn-outline'}" onclick="toggleLikeOnPage(${postId})" id="likeBtn">
                        ${isLiked ? '❤️ Liked' : '🤍 Like'} (${likes.length})
                    </button>
                </div>
                
                <div class="comments-section">
                    <h3 style="font-size: 28px; margin-bottom: 30px;">💬 Comments (${comments.length})</h3>
                    
                    ${currentUser ? `
                        <div class="comment-form" style="margin-bottom: 40px;">
                            <div style="display: flex; gap: 12px;">
                                <input type="text" id="commentInput" placeholder="Write your comment..." style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid var(--border); background: var(--bg-secondary); color: var(--text-primary);">
                                <button class="btn btn-primary" onclick="submitCommentOnPage(${postId})">Send</button>
                            </div>
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 30px; background: var(--bg-secondary); border-radius: 12px; margin-bottom: 40px;">
                            <p style="color: var(--text-secondary); margin-bottom: 20px;">You must log in to comment.</p>
                            <button class="btn btn-primary" onclick="openLoginModal()">Log In</button>
                        </div>
                    `}
                    
                    <div id="commentsList" style="display: grid; gap: 20px;">
                        ${comments.length === 0 ? 
                            '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No comments yet. Be the first to comment!</p>' 
                            : 
                            comments.reverse().map(comment => `
                                <div class="comment">
                                    <div class="comment-author">${comment.author}</div>
                                    <div class="comment-content">${comment.content}</div>
                                    <div style="font-size:12px; color:var(--text-secondary); margin-top:8px;">${new Date(comment.createdAt).toLocaleDateString('en-US')}</div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 60px; padding-top: 40px; border-top: 2px solid var(--border);">
                    <a href="index.html" class="btn btn-outline">← Go to All Posts</a>
                </div>
            </article>
        `;
        
    } catch (error) {
        console.error('Post load error:', error);
        document.getElementById('postDetailContainer').innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h2 style="color: var(--danger);">❌ An Error Occurred</h2>
                <p style="color: var(--text-secondary);">There was a problem loading the post.</p>
                <a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Go to Homepage</a>
            </div>
        `;
    }
}

async function toggleLikeOnPage(postId) {
    if (!currentUser) {
        alert('You must log in to like!');
        openLoginModal();
        return;
    }

    const likesKey = `likes:${postId}`;
    
    try {
        let likes = [];
        let isStorage = (typeof window.storage !== 'undefined');
        
        if (isStorage) {
            const result = await window.storage.get(likesKey, true).catch(() => null);
            likes = result && result.value ? JSON.parse(result.value) : [];
        } else if (typeof localStorage !== 'undefined') {
            const data = localStorage.getItem(likesKey);
            likes = data ? JSON.parse(data) : [];
        }

        const userEmail = currentUser.email;

        if (likes.includes(userEmail)) {
            likes = likes.filter(email => email !== userEmail);
        } else {
            likes.push(userEmail);
        }
        
        if (isStorage) {
            await window.storage.set(likesKey, JSON.stringify(likes), true);
        } else {
            localStorage.setItem(likesKey, JSON.stringify(likes));
        }
        
        // Sayfayı yenile
        loadPostPage();

    } catch (error) {
        console.error('Like error:', error);
        alert('An error occurred during the liking process!');
    }
}

async function submitCommentOnPage(postId) {
    if (!currentUser) {
        alert('You must log in to comment!');
        openLoginModal();
        return;
    }
    
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();

    if (!content) {
        alert('Comment field cannot be left blank!');
        return;
    }

    const comment = {
        author: currentUser.name,
        content: content,
        createdAt: new Date().toISOString()
    };
    
    const commentsKey = `comments:${postId}`;

    try {
        let comments = [];
        let isStorage = (typeof window.storage !== 'undefined');
        
        if (isStorage) {
            const result = await window.storage.get(commentsKey, true).catch(() => null);
            comments = result && result.value ? JSON.parse(result.value) : [];
        } else if (typeof localStorage !== 'undefined') {
            const data = localStorage.getItem(commentsKey);
            comments = data ? JSON.parse(data) : [];
        }
        
        comments.push(comment);

        if (isStorage) {
            await window.storage.set(commentsKey, JSON.stringify(comments), true);
        } else {
            localStorage.setItem(commentsKey, JSON.stringify(comments));
        }
        
        alert('✅ Your comment was successfully added!');
        loadPostPage(); // Sayfayı yenile

    } catch (error) {
        console.error('Comment submission error:', error);
        alert('An error occurred while submitting your comment!');
    }
}

// ====================================================================
// POST OPERATIONS (CREATE, LOAD, DASHBOARD)
// ====================================================================

async function createPost() {
    if (!currentUser) {
        alert('Unauthorized action!');
        window.location.href = 'index.html';
        return;
    }

    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value.trim();
    const imageFile = document.getElementById('postImage') ? document.getElementById('postImage').files[0] : null;
    
    const MAX_IMAGE_SIZE = 500 * 1024; // 500 KB
    const MAX_CONTENT_LENGTH = 10000; // 10000 karakter

    if (!title || !content || !category) {
        alert('⚠️ Title, category, and content are mandatory!');
        return;
    }
    
    if (content.length > MAX_CONTENT_LENGTH) {
        alert(`⚠️ Content size is too large! Maximum ${MAX_CONTENT_LENGTH.toLocaleString()} characters allowed. Current: ${content.length} characters.`);
        return;
    }

    let postImageBase64 = '';
    if (imageFile) {
        if (imageFile.size > MAX_IMAGE_SIZE) {
            alert('⚠️ Post image size is too large (Maximum 500KB). Please select a smaller image.');
            return; 
        }

        try {
            postImageBase64 = await fileToBase64(imageFile);
        } catch (e) {
            alert('An error occurred while converting the image to Base64.');
            console.error('Base64 error:', e);
            return;
        }
    }

    const post = {
        id: Date.now(),
        title,
        category,
        content,
        image: postImageBase64, 
        author: currentUser.name,
        authorEmail: currentUser.email,
        authorAvatar: currentUser.profilePicture,
        createdAt: new Date().toISOString(),
        excerpt: content.substring(0, 150) + (content.length > 150 ? '...' : '')
    };

    try {
        const postData = JSON.stringify(post);
        const postKey = `post:${post.id}`;
        
        console.log('Post is being saved:', postKey);

        if (typeof window.storage !== 'undefined') {
            await window.storage.set(postKey, postData, true); 
        } else if (typeof localStorage !== 'undefined') {
            localStorage.setItem(postKey, postData); 
        }
        
        console.log('Post successfully saved!');
        
        alert('🎉 Your post has been published!');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Post save error:', error);
        alert('❌ An error occurred during publishing! Reason: ' + (error.message || 'Unknown error'));
    }
}

async function loadPosts() {
    try {
        let posts = [];

        if (typeof window.storage !== 'undefined') {
            const result = await window.storage.list('post:', true).catch(() => null); 
            if (result && result.keys) {
                for (const key of result.keys) {
                    const postResult = await window.storage.get(key, true).catch(() => null);
                    if (postResult && postResult.value) {
                        posts.push(JSON.parse(postResult.value));
                    }
                }
            }
        } else if (typeof localStorage !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('post:')) {
                    const postData = localStorage.getItem(key);
                    if (postData) {
                        posts.push(JSON.parse(postData));
                    }
                }
            }
        }
        
        if (posts.length === 0) {
            showEmptyState();
            return;
        }
        
        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        displayPosts(posts);
    } catch (error) {
        console.error('Posts could not be loaded:', error);
        showEmptyState();
    }
}

function displayPosts(posts) {
    const filteredPosts = currentCategory === 'all' 
        ? posts 
        : posts.filter(post => post.category === currentCategory);

    const blogGrid = document.getElementById('blogGrid');
    const emptyState = document.getElementById('emptyState');

    if (!blogGrid) return; 
    
    if (filteredPosts.length === 0) {
        showEmptyState();
        return;
    }

    blogGrid.innerHTML = '';
    if (emptyState) emptyState.classList.add('hidden');

    filteredPosts.forEach(post => {
        const card = createBlogCard(post);
        blogGrid.appendChild(card);
    });
}

function createBlogCard(post) {
    const card = document.createElement('div');
    card.className = 'blog-card';
    card.onclick = () => window.location.href = `post.html?id=${post.id}`;
    
    const date = new Date(post.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const categoryEmojis = {
        'teknoloji': '💻',
        'tasarim': '🎨',
        'yazilim': '⚡',
        'yaraticilik': '✨'
    };
    
    const authorAvatarStyle = post.authorAvatar ? `background-image: url('${post.authorAvatar}'); background-size: cover; background-position: center;` : '';
    const authorAvatarText = post.authorAvatar ? '' : post.author.charAt(0).toUpperCase();
    
    const imageSrc = post.image;

    card.innerHTML = `
        <div class="blog-image-wrapper">
            ${imageSrc
                ? `<img src="${imageSrc}" alt="${post.title}" class="blog-image" onerror="this.style.display='none'">` 
                : `<div class="blog-image-placeholder">${categoryEmojis[post.category] || '📝'} ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</div>`
            }
        </div>
        <div class="blog-content">
            <div class="blog-meta">
                <span>📅 ${formattedDate}</span>
            </div>
            <h3>${post.title}</h3>
            <p class="blog-excerpt">${post.excerpt}</p>
            <span class="blog-category">${categoryEmojis[post.category] || '📝'} ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</span>
            <div class="blog-author">
                <div class="author-avatar" style="${authorAvatarStyle}">${authorAvatarText}</div>
                <div class="author-info">
                    <div class="author-name">${post.author}</div>
                </div>
            </div>
        </div>
    `;

    return card;
}

// ====================================================================
// DASHBOARD LOGIC
// ====================================================================

async function loadDashboard() {
    if (!currentUser) return;
    
    const profileNameEl = document.getElementById('profileName');
    const profileEmailEl = document.getElementById('profileEmail');
    const profilePasswordEl = document.getElementById('profilePassword');
    
    if (profileNameEl) profileNameEl.value = currentUser.name || '';
    if (profileEmailEl) profileEmailEl.value = currentUser.email || '';
    if (profilePasswordEl) profilePasswordEl.value = ''; 
    
    const profileDisplay = document.getElementById('currentProfilePicture');
    if (profileDisplay) {
        if (currentUser.profilePicture) {
            profileDisplay.style.backgroundImage = `url('${currentUser.profilePicture}')`;
            profileDisplay.textContent = '';
        } else {
            profileDisplay.style.backgroundImage = 'none';
            profileDisplay.textContent = currentUser.name.charAt(0).toUpperCase();
        }
    }

    let allPosts = [];
    let totalLikes = 0;
    let totalComments = 0;
    
    if (typeof window.storage !== 'undefined') {
        const result = await window.storage.list('post:', true).catch(() => null); 
        if (result && result.keys) {
            for (const key of result.keys) {
                const postResult = await window.storage.get(key, true).catch(() => null);
                if (postResult && postResult.value) {
                    allPosts.push(JSON.parse(postResult.value));
                }
            }
        }
    } else if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('post:')) {
                const postData = localStorage.getItem(key);
                if (postData) {
                    allPosts.push(JSON.parse(postData));
                }
            }
        }
    }
    
    const userPosts = allPosts.filter(p => p.authorEmail === currentUser.email);
    const myPostsList = document.getElementById('myPostsList');
    if (!myPostsList) return; 
    
    myPostsList.innerHTML = ''; 
    
    const totalPostsEl = document.getElementById('totalPosts');
    if (totalPostsEl) totalPostsEl.textContent = userPosts.length;
    
    if (userPosts.length === 0) {
        myPostsList.innerHTML = '<p class="placeholder-text">You don\'t have any posts yet. Write a new one!</p>';
    } else {
        userPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        for (const post of userPosts) {
            const likesKey = `likes:${post.id}`;
            const commentsKey = `comments:${post.id}`;
            
            let likes = [];
            let comments = [];
            
            if (typeof window.storage !== 'undefined') {
                const likesResult = await window.storage.get(likesKey, true).catch(() => null);
                likes = likesResult && likesResult.value ? JSON.parse(likesResult.value) : [];
                
                const commentsResult = await window.storage.get(commentsKey, true).catch(() => null);
                comments = commentsResult && commentsResult.value ? JSON.parse(commentsResult.value) : [];
            } else if (typeof localStorage !== 'undefined') {
                const likesData = localStorage.getItem(likesKey);
                likes = likesData ? JSON.parse(likesData) : [];
                
                const commentsData = localStorage.getItem(commentsKey);
                comments = commentsData ? JSON.parse(commentsData) : [];
            }
            
            totalLikes += likes.length;
            totalComments += comments.length;
            
            const date = new Date(post.createdAt).toLocaleDateString('en-US');

            const postItem = document.createElement('div');
            postItem.className = 'my-post-item';
            postItem.innerHTML = `
                <div class="post-title-date">
                    <h4>${post.title}</h4>
                    <small>Category: ${post.category.charAt(0).toUpperCase() + post.category.slice(1)} | Published: ${date}</small>
                </div>
                <div class="post-actions">
                    <span style="font-size:13px; color:var(--text-secondary); margin-right:10px;">❤️ ${likes.length} | 💬 ${comments.length}</span>
                    <button class="btn btn-outline btn-sm" onclick="window.location.href='post.html?id=${post.id}'">View</button>
                    <button class="btn btn-outline btn-sm" onclick="deletePost(${post.id})" style="color: var(--danger); border-color: var(--danger);">Delete</button>
                </div>
            `;
            myPostsList.appendChild(postItem);
        }
    }
    
    const totalLikesEl = document.getElementById('totalLikes');
    const totalCommentsEl = document.getElementById('totalComments');
    
    if (totalLikesEl) totalLikesEl.textContent = totalLikes;
    if (totalCommentsEl) totalCommentsEl.textContent = totalComments;
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        if (typeof window.storage !== 'undefined') {
            await window.storage.delete(`post:${postId}`, true);
            await window.storage.delete(`likes:${postId}`, true);
            await window.storage.delete(`comments:${postId}`, true);
        } else if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(`post:${postId}`);
            localStorage.removeItem(`likes:${postId}`);
            localStorage.removeItem(`comments:${postId}`);
        } else {
            alert('❌ Storage must be accessible for the delete operation!');
            return;
        }
        
        alert('✅ Post successfully deleted!');
        loadDashboard();
        if (document.getElementById('blogGrid')) {
            loadPosts(); 
        }
    } catch (error) {
        console.error('Error while deleting post:', error);
        alert('❌ An error occurred while deleting the post!');
    }
}

// ====================================================================
// MODAL / DETAIL AND INTERACTION LOGIC
// ====================================================================

async function openPostDetailModal(postId) {
    let postResult = null;
    
    if (typeof window.storage !== 'undefined') {
        postResult = await window.storage.get(`post:${postId}`, true).catch(() => null);
    } else if (typeof localStorage !== 'undefined') {
        const postData = localStorage.getItem(`post:${postId}`);
        if (postData) {
            postResult = { value: postData };
        }
    } else {
        alert('This post was not found (Storage is inaccessible)!');
        return;
    }

    if (!postResult || !postResult.value) {
        alert('This post was not found!');
        return;
    }

    try {
        const post = JSON.parse(postResult.value);
        const detailContent = document.getElementById('postDetailContent');
        const date = new Date(post.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const categoryEmojis = {
            'teknoloji': '💻',
            'tasarim': '🎨',
            'yazilim': '⚡',
            'yaraticilik': '✨'
        };
        const categoryLabel = `${categoryEmojis[post.category] || '📝'} ${post.category.charAt(0).toUpperCase() + post.category.slice(1)}`;
        const imageSrc = post.image;

        if (detailContent) {
            detailContent.innerHTML = `
                ${imageSrc && imageSrc.startsWith('data:image') ? `<img src="${imageSrc}" alt="${post.title}" class="post-image-full" onerror="this.style.display='none'">` : ''}
                <div class="post-header-meta">
                    <span>${categoryLabel}</span> • 
                    <span>Author: ${post.author}</span> • 
                    <span>Date: ${formattedDate}</span>
                </div>
                <h2>${post.title}</h2>
                <p>${post.content}</p>
            `;
        }
        
        const likeButton = document.getElementById('likeButton');
        const commentForm = document.getElementById('commentForm');
        const commentLoginPrompt = document.getElementById('commentLoginPrompt');
        
        if (likeButton) likeButton.dataset.postId = postId; 
        if (commentForm) commentForm.dataset.postId = postId; 

        await loadLikes(postId);
        await loadComments(postId);
        
        if (commentForm && commentLoginPrompt) {
            if (currentUser) {
                commentForm.classList.remove('hidden');
                commentLoginPrompt.style.display = 'none';
            } else {
                commentForm.classList.add('hidden');
                commentLoginPrompt.style.display = 'block';
            }
        }
        
        const modal = document.getElementById('postDetailModal');
        if (modal) modal.classList.add('active');

    } catch (error) {
        console.error('Post detail load error:', error);
        alert('An error occurred while loading the post detail.');
    }
}

async function loadLikes(postId) {
    const likeButton = document.getElementById('likeButton');
    if (!likeButton) return;
    const likesKey = `likes:${postId}`;
    
    try {
        let likes = [];
        if (typeof window.storage !== 'undefined') {
            const result = await window.storage.get(likesKey, true).catch(() => null);
            likes = result && result.value ? JSON.parse(result.value) : [];
        } else if (typeof localStorage !== 'undefined') {
            const data = localStorage.getItem(likesKey);
            likes = data ? JSON.parse(data) : [];
        }
        
        likeButton.textContent = `❤️ Like (${likes.length})`;
        likeButton.classList.remove('liked');

        if (currentUser && likes.includes(currentUser.email)) {
            likeButton.classList.add('liked');
            likeButton.textContent = `❤️ Liked (${likes.length})`;
        }
        
    } catch (error) {
        console.error('Like load error:', error);
        likeButton.textContent = `❤️ Like (0)`;
    }
}

async function toggleLike(postId) {
    if (!currentUser) {
        alert('You must log in to like!');
        return;
    }

    const likesKey = `likes:${postId}`;
    
    try {
        let likes = [];
        let isStorage = (typeof window.storage !== 'undefined');
        
        if (isStorage) {
            const result = await window.storage.get(likesKey, true).catch(() => null);
            likes = result && result.value ? JSON.parse(result.value) : [];
        } else if (typeof localStorage !== 'undefined') {
            const data = localStorage.getItem(likesKey);
            likes = data ? JSON.parse(data) : [];
        } else {
            alert('Storage is not accessible for the like operation.');
            return;
        }

        const userEmail = currentUser.email;

        if (likes.includes(userEmail)) {
            likes = likes.filter(email => email !== userEmail);
        } else {
            likes.push(userEmail);
        }
        
        if (isStorage) {
            await window.storage.set(likesKey, JSON.stringify(likes), true);
        } else {
            localStorage.setItem(likesKey, JSON.stringify(likes));
        }
        
        loadLikes(postId); 

    } catch (error) {
        console.error('Like error:', error);
        alert('An error occurred during the liking process!');
    }
}

async function loadComments(postId) {
    const commentsList = document.getElementById('commentsList');
    const commentCountSpan = document.getElementById('commentCount');
    if (!commentsList || !commentCountSpan) return;

    const commentsKey = `comments:${postId}`;
    commentsList.innerHTML = ''; 

    try {
        let comments = [];
        if (typeof window.storage !== 'undefined') {
            const result = await window.storage.get(commentsKey, true).catch(() => null);
            comments = result && result.value ? JSON.parse(result.value) : [];
        } else if (typeof localStorage !== 'undefined') {
            const data = localStorage.getItem(commentsKey);
            comments = data ? JSON.parse(data) : [];
        } else {
            commentCountSpan.textContent = 0;
            commentsList.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">No comments yet. Be the first to comment!</p>';
            return;
        }
        
        commentCountSpan.textContent = comments.length;

        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">No comments yet. Be the first to comment!</p>';
            return;
        }

        comments.reverse().forEach(comment => { 
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            commentDiv.innerHTML = `
                <div class="comment-author">${comment.author}</div>
                <div class="comment-content">${comment.content}</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:5px;">${new Date(comment.createdAt).toLocaleDateString('en-US')}</div>
            `;
            commentsList.appendChild(commentDiv);
        });

    } catch (error) {
        console.error('Comment load error:', error);
    }
}

async function submitComment(postId) {
    if (!currentUser) {
        alert('You must log in to comment!');
        return;
    }
    
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();

    if (!content) {
        alert('Comment field cannot be left blank!');
        return;
    }

    const comment = {
        author: currentUser.name,
        content: content,
        createdAt: new Date().toISOString()
    };
    
    const commentsKey = `comments:${postId}`;

    try {
        let comments = [];
        let isStorage = (typeof window.storage !== 'undefined');
        
        if (isStorage) {
            const result = await window.storage.get(commentsKey, true).catch(() => null);
            comments = result && result.value ? JSON.parse(result.value) : [];
        } else if (typeof localStorage !== 'undefined') {
            const data = localStorage.getItem(commentsKey);
            comments = data ? JSON.parse(data) : [];
        } else {
            alert('Storage is not accessible for the comment submission.');
            return;
        }
        
        comments.push(comment);

        if (isStorage) {
            await window.storage.set(commentsKey, JSON.stringify(comments), true);
        } else {
            localStorage.setItem(commentsKey, JSON.stringify(comments));
        }
        
        commentInput.value = ''; 
        loadComments(postId); 
        alert('Your comment was successfully added!');

    } catch (error) {
        console.error('Comment submission error:', error);
        alert('An error occurred while submitting your comment!');
    }
}

// ====================================================================
// CRITICAL CLEANUP FUNCTION
// ====================================================================

async function clearAllData() {
    if (!confirm('🚨 WARNING: Are you sure you want to permanently delete all your blog posts, likes, comments, and session? This action is irreversible!')) {
        return;
    }
    
    if (typeof window.storage === 'undefined' && typeof localStorage === 'undefined') {
        alert('Storage is inaccessible.');
        return;
    }

    try {
        if (typeof window.storage !== 'undefined') {
            const postResult = await window.storage.list('post:', true).catch(() => null);
            if (postResult && postResult.keys) {
                for (const key of postResult.keys) {
                    const postId = key.substring(5); 
                    await window.storage.delete(key, true);
                    await window.storage.delete(`likes:${postId}`, true);
                    await window.storage.delete(`comments:${postId}`, true);
                }
            }
            
            await window.storage.delete('currentUser');
            
            const userResult = await window.storage.list('user-', false).catch(() => null);
            if (userResult && userResult.keys) {
                for (const key of userResult.keys) {
                    await window.storage.delete(key);
                }
            }
        } else if (typeof localStorage !== 'undefined') {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('post:') || key.startsWith('likes:') || key.startsWith('comments:') || key.startsWith('user-'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.push('currentUser');
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }
        
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
        }
        
        currentUser = null;
        alert('✅ All Blog Data Successfully Cleared! Storage is now empty. Log in to start over.');
        window.location.href = 'index.html'; 
    } catch (error) {
        console.error('Error during critical cleanup:', error);
        alert('❌ Critical cleanup operation failed.');
    }
}

// ====================================================================
// GENERAL UI/NAVIGATION LOGIC
// ====================================================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') { 
                e.preventDefault(); 
                return;
            }
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 90, 
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

function initCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            loadPosts();
        });
    });

    document.querySelectorAll('.footer-links a[href*="#articles"][data-category]').forEach(link => {
        link.addEventListener('click', (e) => {
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
                const categoryToFilter = link.dataset.category;
                currentCategory = categoryToFilter;
                
                document.querySelectorAll('.category-btn').forEach(b => {
                    b.classList.remove('active');
                    if (b.dataset.category === categoryToFilter) {
                        b.classList.add('active');
                    }
                });
                
                loadPosts();
            }
        });
    });
}

function showEmptyState() {
    const blogGrid = document.getElementById('blogGrid');
    const emptyState = document.getElementById('emptyState');
    if (blogGrid) {
        blogGrid.innerHTML = '';
    }
    if (emptyState) {
        emptyState.classList.remove('hidden'); 
    }
}

function openLoginModal() {
    closeModal('registerModal');
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('active');
}

function openRegisterModal() {
    closeModal('loginModal');
    const modal = document.getElementById('registerModal');
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function switchToRegister() {
    closeModal('loginModal');
    openRegisterModal();
}

function switchToLogin() {
    closeModal('registerModal');
    openLoginModal();
}

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});