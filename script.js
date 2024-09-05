document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const loginContainer = document.getElementById('loginContainer');
    const mainContent = document.getElementById('mainContent');
    const loginError = document.getElementById('loginError');
    const uploadForm = document.getElementById('uploadForm');
    const photoGallery = document.getElementById('photoGallery');

    let photos = [];
    let currentIndex = 0;

    // Handle login form submission
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const userId = document.getElementById('userId').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `userId=${encodeURIComponent(userId)}&password=${encodeURIComponent(password)}`
            });
            const data = await response.json();
            if (data.success) {
                loginContainer.style.display = 'none';
                mainContent.style.display = 'block';
                fetchPhotos();  // Load existing photos after login
            } else {
                loginError.textContent = 'Invalid login credentials. Please try again.';
            }
        } catch (err) {
            console.error('Error:', err);
            loginError.textContent = 'An error occurred. Please try again.';
        }
    });

    // Handle photo upload form submission
    uploadForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Prevent form from refreshing the page
        const formData = new FormData(uploadForm);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (data.success) {
                    renderPhotos(data.photos);
                } else {
                    alert('Upload failed: ' + (data.error || 'Unknown error'));
                }
            } else {
                throw new Error('Invalid content-type, expected application/json');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('An error occurred during upload: ' + err.message);
        }
    });

    // Function to parse dates to a comparable format
    function parseDate(dateString) {
        // Assuming dateString is in "YYYY-MM-DD" format
        const parts = dateString.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Months are 0-based
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }
    
    // Function to format date to "Month Day, Year"
    function formatDate(dateString) {
        const date = parseDate(dateString);
        if (isNaN(date.getTime())) {
            return null; // Return null for invalid dates
        }
        const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
        return date.toLocaleDateString(undefined, options);
    }

    // Function to render photos
    function renderPhotos(photosList) {
        photos = photosList;

        // Function to parse dates to a comparable format
        function parseDate(dateString) {
            try {
                // Create a new Date object from the given date string
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    throw new Error('Invalid date');
                }
                return date;
            } catch (error) {
                console.warn(`Date parsing error: ${error.message} for date string: ${dateString}`);
                return null;
            }
        }

        // Log to check invalid dates
        photos.forEach(photo => {
            const date = parseDate(photo.date);
            if (!date) {
                console.warn(`Invalid date found for photo ${photo.filename}: ${photo.date}`);
            }
        });

        // Sort photos by date in descending order
        photos.sort((a, b) => parseDate(b.date) - parseDate(a.date));

        // Function to format date to "Month Day, Year"
        function formatDate(dateString) {
            const date = parseDate(dateString);
            if (!date) {
                return null; // Return null for invalid dates
            }
            // Ensure date is correctly formatted
            const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
            return date.toLocaleDateString(undefined, options);
        }

        // Group photos by formatted date
        const groupedPhotos = photos.reduce((acc, photo) => {
            const formattedDate = formatDate(photo.date); // Format date
            if (!formattedDate) {
                if (!acc['Invalid Dates']) {
                    acc['Invalid Dates'] = [];
                }
                acc['Invalid Dates'].push(photo);
            } else {
                if (!acc[formattedDate]) {
                    acc[formattedDate] = [];
                }
                acc[formattedDate].push(photo);
            }
            return acc;
        }, {});

        console.log('Grouped Photos:', groupedPhotos); // Debugging line

        photoGallery.innerHTML = ''; // Clear existing photos

        // Render photos by date
        Object.keys(groupedPhotos).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
            const dateSection = document.createElement('div');
            dateSection.classList.add('photo-date-section');

            const dateHeader = document.createElement('h3');
            dateHeader.textContent = date === 'Invalid Dates' ? 'Invalid Dates' : date;
            dateHeader.classList.add('photo-date-header');
            dateSection.appendChild(dateHeader);

            const photoItemsContainer = document.createElement('div');
            photoItemsContainer.classList.add('photo-items-container');

            groupedPhotos[date].forEach(photo => {
                const photoItem = document.createElement('div');
                photoItem.classList.add('photo-item');
                const img = document.createElement('img');
                img.src = `/uploads/${photo.filename}`;
                img.alt = date;
                img.dataset.filename = photo.filename;
                img.dataset.date = date;
                img.addEventListener('click', showPhotoDetails);
                photoItem.appendChild(img);

                photoItemsContainer.appendChild(photoItem);
            });

            dateSection.appendChild(photoItemsContainer);
            photoGallery.appendChild(dateSection);
        });
    }


    // Function to fetch and display photos after login
    async function fetchPhotos() {
        try {
            const response = await fetch('/photos');
            const data = await response.json();
            console.log('Raw photo data:', data.photos); // Log raw photo data
            renderPhotos(data.photos);
        } catch (err) {
            console.error('Error fetching photos:', err);
            alert('Failed to load photos');
        }
    }
    

    // Function to show photo details in a modal
    function showPhotoDetails(e) {
        const filename = e.target.dataset.filename;
        const date = e.target.dataset.date;
    
        currentIndex = photos.findIndex(photo => photo.filename === filename);
    
        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.innerHTML = `
            <div class="modal-content">
                <button id="prevButton" class="modal-prev"><-</button>
                <div class="modal-body">
                    <span class="close">&times;</span>
                    <img src="/uploads/${filename}" alt="${date}" class="modal-img">
                    <div class="modal-options">
                        <button id="downloadButton">Download</button>
                        <button id="goBackButton">Go Back</button>
                        <button id="deleteButton">Delete</button>
                    </div>
                </div>
                <button id="nextButton" class="modal-next">-></button>
            </div>
        `;
        document.body.appendChild(modal);
    
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    
        const nextBtn = modal.querySelector('#nextButton');
        const prevBtn = modal.querySelector('#prevButton');
        const downloadBtn = modal.querySelector('#downloadButton');
        const deleteBtn = modal.querySelector('#deleteButton');
        const goBackBtn = modal.querySelector('#goBackButton');
    
        nextBtn.addEventListener('click', () => movePhoto('next'));
        prevBtn.addEventListener('click', () => movePhoto('prev'));
        downloadBtn.addEventListener('click', () => downloadPhoto(filename));
        goBackBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            fetchPhotos(); // Refresh gallery view
        });
    
        deleteBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you sure you want to delete this photo?');
            if (confirmed) {
                await deletePhoto(filename);
                document.body.removeChild(modal); // Remove modal after deletion
            }
        });
    }
    
    // Function to download a photo
    function downloadPhoto(filename) {
        window.location.href = `/downloads/${filename}`;
    }

    // Function to delete a photo
    async function deletePhoto(filename) {
        try {
            const response = await fetch(`/delete/${filename}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                document.querySelector(`img[data-filename="${filename}"]`).parentElement.remove();
            } else {
                alert('Failed to delete photo');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('An error occurred during deletion');
        }
    }

    // Function to move to next or previous photo
    function movePhoto(direction) {
        if (direction === 'next') {
            currentIndex = (currentIndex + 1) % photos.length;
        } else if (direction === 'prev') {
            currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        }

        const photo = photos[currentIndex];
        document.querySelector('.modal-img').src = `/uploads/${photo.filename}`;
    }
});
