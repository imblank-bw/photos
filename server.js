const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { format } = require('date-fns');
const { exiftool } = require('exiftool-vendored');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static('uploads'));

// Ensure the uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Ensure the photosData.json file exists
const dataFilePath = path.join(__dirname, 'photosData.json');
if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
}

// Login route
app.post('/login', (req, res) => {
    const { userId, password } = req.body;
    if (userId === 'admin' && password === 'password') {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Photo upload route
app.post('/upload', upload.array('photos'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files were uploaded.' });
    }

    const uploadedPhotos = await Promise.all(req.files.map(async file => {
        const filePath = path.join(__dirname, file.path);
        let exifData;

        try {
            exifData = await exiftool.read(filePath);
        } catch (err) {
            console.error('Error reading EXIF data:', err);
            exifData = {};
        }

        // Extract and format the date
        const dateTag = exifData.DateTimeOriginal || exifData.DateTime;
        let formattedDate;

        try {
            formattedDate = dateTag ? format(new Date(dateTag), 'MMMM d, yyyy') : 'Unknown date';
        } catch (err) {
            console.error('Error formatting date:', err);
            formattedDate = 'Unknown date';
        }

        return {
            filename: file.filename,
            date: formattedDate,
            location: exifData.GPSLatitude ? 
                { latitude: exifData.GPSLatitude, longitude: exifData.GPSLongitude } : null
        };
    }));

    // Save data to a JSON file
    fs.readFile(dataFilePath, (err, existingData) => {
        let photosData = [];
        if (err) {
            console.error('Error reading data file:', err);
            return res.status(500).json({ success: false, error: 'Failed to read data file' });
        }

        try {
            photosData = JSON.parse(existingData);
        } catch (parseError) {
            console.error('Error parsing existing data file:', parseError);
            return res.status(500).json({ success: false, error: 'Failed to parse existing data' });
        }

        photosData = photosData.concat(uploadedPhotos);

        fs.writeFile(dataFilePath, JSON.stringify(photosData, null, 2), err => {
            if (err) {
                console.error('Error saving data:', err);
                return res.status(500).json({ success: false, error: 'Error saving data' });
            }
            res.status(200).json({ success: true, photos: uploadedPhotos });
        });
    });
});

// Fetch all photos
app.get('/photos', (req, res) => {
    fs.readFile(dataFilePath, (err, data) => {
        if (err) {
            console.error('Error loading photos:', err);
            return res.status(500).json({ error: 'Failed to load photos' });
        }

        const photos = JSON.parse(data);
        res.json({ photos });
    });
});

// Download photo
app.get('/downloads/:filename', (req, res) => {
    const file = path.join(__dirname, 'uploads', req.params.filename);
    res.download(file);
});

// Delete photo
app.delete('/delete/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
