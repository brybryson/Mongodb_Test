const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// MongoDB connection
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const dbName = 'myapp';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB successfully');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        return false;
    }
}

// API Routes

// Check MongoDB connection status
app.get('/api/status', async (req, res) => {
    try {
        await client.db(dbName).admin().ping();
        res.json({ connected: true, message: 'MongoDB connection active' });
    } catch (error) {
        res.json({ connected: false, message: 'MongoDB connection failed' });
    }
});

// ========== USER ROUTES ==========

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const db = client.db(dbName);
        const collection = db.collection('users');
        const users = await collection.find({}).sort({ created: -1 }).toArray();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new user
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        
        // Validate required fields
        if (!name || !email || !phone || !address) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required' 
            });
        }
        
        const db = client.db(dbName);
        const collection = db.collection('users');
        
        // Check if email already exists
        const existingUser = await collection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email already exists' 
            });
        }
        
        // Insert new user
        const newUser = {
            name,
            email,
            phone,
            address,
            created: new Date()
        };
        
        const result = await collection.insertOne(newUser);
        
        res.json({ 
            success: true, 
            message: 'User added successfully',
            userId: result.insertedId 
        });
        
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const db = client.db(dbName);
        const collection = db.collection('users');
        
        const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        
        if (result.deletedCount === 1) {
            res.json({ success: true, message: 'User deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== PET ROUTES ==========

// Get all pets
app.get('/api/pets', async (req, res) => {
    try {
        const db = client.db(dbName);
        const collection = db.collection('pets');
        const pets = await collection.find({}).sort({ created: -1 }).toArray();
        res.json({ success: true, pets });
    } catch (error) {
        console.error('Error fetching pets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new pet
app.post('/api/pets', async (req, res) => {
    try {
        const { petName, species, breed, age, ownerName, ownerPhone } = req.body;
        
        // Validate required fields
        if (!petName || !species || !breed || !age || !ownerName || !ownerPhone) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required' 
            });
        }
        
        // Validate age is a positive number
        if (age < 0 || age > 50) {
            return res.status(400).json({ 
                success: false, 
                error: 'Age must be between 0 and 50 years' 
            });
        }
        
        const db = client.db(dbName);
        const collection = db.collection('pets');
        
        // Insert new pet
        const newPet = {
            petName,
            species,
            breed,
            age: parseInt(age),
            ownerName,
            ownerPhone,
            created: new Date()
        };
        
        const result = await collection.insertOne(newPet);
        
        res.json({ 
            success: true, 
            message: 'Pet added successfully',
            petId: result.insertedId 
        });
        
    } catch (error) {
        console.error('Error adding pet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete pet
app.delete('/api/pets/:id', async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const db = client.db(dbName);
        const collection = db.collection('pets');
        
        const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        
        if (result.deletedCount === 1) {
            res.json({ success: true, message: 'Pet deleted successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Pet not found' });
        }
    } catch (error) {
        console.error('Error deleting pet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== PAGE ROUTES ==========

// Serve the Users HTML file (main page)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'mongodb-app.html'));
});

// Serve the Pets HTML file
app.get('/pets', (req, res) => {
    res.sendFile(path.join(__dirname, 'pets.html'));
});

// Start server
async function startServer() {
    const connected = await connectToMongoDB();
    
    app.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
        if (connected) {
            console.log('📊 MongoDB connected - Ready to save data!');
        } else {
            console.log('⚠️  MongoDB not connected - Check your MongoDB service');
        }
        console.log('\n📝 Available pages:');
        console.log('   👥 Users: http://localhost:3000');
        console.log('   🐾 Pets:  http://localhost:3000/pets');
        console.log('\n📊 API Endpoints:');
        console.log('   GET    /api/users - Get all users');
        console.log('   POST   /api/users - Add new user');
        console.log('   DELETE /api/users/:id - Delete user');
        console.log('   GET    /api/pets - Get all pets');
        console.log('   POST   /api/pets - Add new pet');
        console.log('   DELETE /api/pets/:id - Delete pet');
        console.log('   GET    /api/status - Check MongoDB status');
    });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await client.close();
    process.exit(0);
});

startServer();