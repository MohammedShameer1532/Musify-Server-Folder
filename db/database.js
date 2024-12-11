const dotenv = require('dotenv');
dotenv.config(); 
const mongoose = require('mongoose')

const Db = process.env.MONGO_URI ;


const connectToDatabase  = async () => {
  try {
    await mongoose.connect(Db)
    console.log('Connected to MongoDB successfully!');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
  }
}
connectToDatabase ();

