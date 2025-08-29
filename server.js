const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
// ✅ CHANGE 1: Use environment variable for port (required for cloud hosting)
const port = process.env.PORT || 3000;

// ✅ CHANGE 2: Use environment variable for MongoDB URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const dbName = process.env.DB_NAME || 'myapp';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB successfully');
        console.log('📍 Database:', dbName);
        console.log('🌐 MongoDB URI:', uri.includes('localhost') ? 'Local MongoDB' : 'Cloud MongoDB');
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
        res.json({ 
            connected: true, 
            message: 'MongoDB connection active',
            environment: process.env.NODE_ENV || 'development',
            database: dbName
        });
    } catch (error) {
        res.json({ 
            connected: false, 
            message: 'MongoDB connection failed',
            error: error.message 
        });
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

// ✅ CHANGE 3: Add health check endpoint (helpful for cloud hosting)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Start server
async function startServer() {
    const connected = await connectToMongoDB();
    
    app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        if (connected) {
            console.log('📊 MongoDB connected - Ready to save data!');
        } else {
            console.log('⚠️  MongoDB not connected - Check your MongoDB service');
        }
        console.log('\n📝 Available pages:');
        console.log('   👥 Users: /');
        console.log('   🐾 Pets:  /pets');
        console.log('\n📊 API Endpoints:');
        console.log('   GET    /api/users - Get all users');
        console.log('   POST   /api/users - Add new user');
        console.log('   DELETE /api/users/:id - Delete user');
        console.log('   GET    /api/pets - Get all pets');
        console.log('   POST   /api/pets - Add new pet');
        console.log('   DELETE /api/pets/:id - Delete pet');
        console.log('   GET    /api/status - Check MongoDB status');
        console.log('   GET    /health - Health check');
    });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await client.close();
    process.exit(0);
});

// ✅ CHANGE 4: Handle uncaught exceptions (good for production)
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

startServer();