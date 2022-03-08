const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const router = require('./routes/index');
const mongoose = require('mongoose');
const mongo = require('./config/database');
require('dotenv').config();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser())




// Mongo DB connection
const connectDB = async () => {
    try {
        await mongoose.connect(mongo.url);
        console.log('MongoDB Connected ...');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        connectDB();
    }

}


// Calling the function to connect MongoDB
connectDB();


// To Route all request
app.use(router);



// To handle Not found resources
app.use('*', (req, res) => {
    res.status(404);
    res.send('resource not found')

})


// To handle error in request ( if any uncaught )
app.use((err, req, res, next) => {

    if(err) {
        res.status(500);
        return res.json({message:'server error'});
    }

})


// Server is Listening
app.listen(process.env.PORT || 5000, () => {
    console.log(`Listening to port 5000 ...`);
})
