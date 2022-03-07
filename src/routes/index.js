const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { errorMessages } = require('../constants/error');
const jwt = require('jsonwebtoken');
const Order = require('../models/order');
const User = require('../models/user');
const Question = require('../models/question');
require('dotenv').config();

// Test Page
router.get('/', (req, res) => {
    res.status(200);
    return res.send(`<h1>I am Working</h1>`);
})


/* -------------------Signup and Sign in Routes----------------- */

// Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password, mobile } = req.body;

        // Initial validation of body
        if (!email || !password || !mobile || !firstName || !lastName) {
            res.status(400);
            return res.json({message:'missing or wrong credentials'});
        }

        // checking if user exists in DB
        const DbUser = await User.findAll({ where: { email: email } });

        // If user exists , then send confirmation or else create user in DB
        if (DbUser.length) {
            res.status(200);
            return res.json({message:'user created'});
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await User.create({
                firstName,
                lastName,
                email,
                hashedPassword,
                mobile
            });

            res.status(201);
            return res.json({message:'user created'});
        }

    } catch (error) {
        res.status(500);
        return res.json({message:'server error'});
    }
})


// Signin Route
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Initial validation of body
        if (!email || !password) {
            res.status(400);
            return res.json({message:'missing or wrong credentials'});
        }

        // checking if user exists in DB
        const DbUser = await User.findAll({ where: { email: email } });

        // If user exists , then validate and send confirmation or else send user not in DB    
        if (DbUser.length) {

            // comparing password of user and what is saved in DB
            const isMatch = await bcrypt.compare(password, DbUser[0].dataValues.hashedPassword);

            // If password matches
            if (isMatch) {

                // Add JWT Token( will expire in 24 hrs )
                const token = jwt.sign(DbUser[0].dataValues, process.env.SECRET, { expiresIn: '24h' });

                res.cookie('accessToken', token);
                res.status(200);
                return res.json({message:'user login done'});
            } else {
                res.status(400);
                return res.json({message:'user login failed'});
            }
        } else {
            res.status(400);
            return res.json({message:'user not in DB'});
        }

    } catch (error) {
        res.status(500);
        return res.json({message:'server error'});
    }
})


/* -------------------Home Page Route----------------- */

// Home Page Route
router.get('/home', async (req, res) => {
    try {

        // Checking if cookie is in the request
        const { accessToken } = req.cookies;

        // if no cookies , then send no token found
        if(!accessToken) {
            res.status(400);
            return res.json({message:'no token'});
        }

        // Verifies whether it is a valid JWT token
        const decoded = jwt.verify(accessToken, process.env.SECRET);

        // If token is valid , then provide all questions to FE , else send a failed message
        if (decoded) {

            // Getting Questions from DB
            const Questions = await Question.findAll();
            const mappedQuestions = Questions.map(question => question.dataValues);
            res.status(200);
            return res.send(mappedQuestions);
        } else {
            res.status(400);
            return res.json({message:'invalied token'});
        }
    } catch (error) {
        res.status(500);
        return res.json({message:'server error'});
    }

})


/* -------------------User Order Route----------------- */
// todo
// User order Route
router.post('/user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { questionId, response, slotValue } = req.body;

        if (!email || !questionId || !response || !slotValue) {
            throw new Error(errorMessages.client);
        }


        // Getting question from DB

        const question = await Question.findAll({ where: { id: questionId } });

        if (question.length === 0) {
            throw new Error(errorMessages.client);
        }


        // Update Question DB based on user response and available limit

        if (response === 'yes') {
            const currLimit = question[0].dataValues.yesLimit;

            if (currLimit > 0) {
                await Question.update({ yesLimit: currLimit - 1 }, { where: { id: questionId } });
            } else {
                return res.send('limit is exhausted');
            }

        } else {
            const currLimit = question[0].dataValues.noLimit;

            if (currLimit > 0) {
                await Question.update({ noLimit: currLimit - 1 }, { where: { id: questionId } });
            } else {
                return res.send('limit is exhausted');
            }
        }


        // To get the user details who has submitted the order

        const DbUser = await User.findAll({ where: { email: email } });
        const currPoints = DbUser[0].dataValues.points;


        // Points of the user is updated. ( deducted according to slot value )

        await User.update({ points: currPoints - slotValue }, { where: { email: email } });


        // Order is created in Order table

        await DbUser[0].createOrder(req.body);


        return res.send('order created');

    } catch (error) {
        throw (error);
    }
})



/* --------------Admin Panel Routes------------------- */


// To get all Questions from DB

router.get('/admin/qsn',async (req,res)=>{
    try {
        // Get all questions from user DB
        const Questions = await Question.findAll();
        const mappedQuestions = Questions.map(question => question.dataValues);
        res.status(200);
        res.send(mappedQuestions);

    } catch (error) {
        res.status(500);
        return res.json({message:'server error'});
    }
})


// To Create a Question in DB

router.post('/admin/qsn',async (req,res)=>{
    try {
    
        // Create a question in DB
        await Question.create(req.body);

        res.status(201);
        return res.json({message:'question created'});

    } catch (error) {
        res.status(500);
        return res.json({message:'server error'});
    }
})


// Delete all questions from DB

router.post('/admin/qsn/delete',async (req,res)=>{
    try {
    
        // Delete all items in Question DB
        await Question.destroy();

        res.status(200);
        return res.json({message:'questions deleted'});

    } catch (error) {
        res.status(500);
        return res.json({message:'server error'});
    }
})



// To get all users from DB

router.get('/admin/user',async (req,res)=>{
    try {
        // Get all users from user DB
        const Users = await User.findAll();
        const mappedUsers = Users.map(user => user.dataValues);
        res.status(200);
        res.send(mappedUsers);

    } catch (error) {
        res.status(500);
        return res.json({message:'server error'});
    }
})


/* -------------------Deposit and Withdrawal routes----------------- */


// Money Deposit Route
// todo
router.post('/deposit/:email', (req, res) => {

})


// Money Withdraw Route
// todo
router.post('/withdraw/:email', (req, res) => {

})



module.exports = router;