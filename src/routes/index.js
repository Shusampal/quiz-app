const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Question = require('../models/question');
const Order = require('../models/order');
const dynamicPrice = require('../helpers/index');
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
            return res.json({ message: 'missing or wrong credentials' });
        }

        const mob = mobile.toString();

        if (mob.length !== 10) {
            res.status(400);
            return res.json({ message: 'missing or wrong credentials' });
        }

        // checking if user exists in DB
        const DbUser = await User.find({ email: email }).exec();
        console.log(DbUser);

        // If user exists , then send confirmation or else create user in DB
        if (DbUser.length) {
            res.status(200);
            return res.json({ message: 'user created' });
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            console.log('user creation');
            const doc = new User({
                firstName,
                lastName,
                email,
                hashedPassword,
                mobile
            });
            await doc.save();
            console.log('user created');

            res.status(201);
            return res.json({ message: 'user created' });
        }

    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})


// Signin Route
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Initial validation of body
        if (!email || !password) {
            res.status(400);
            return res.json({ message: 'missing or wrong credentials' });
        }

        // checking if user exists in DB
        const DbUser = await User.find({ email: email }).exec();
        console.log(DbUser);

        // If user exists , then validate and send confirmation or else send user not in DB    
        if (DbUser.length) {

            // comparing password of user and what is saved in DB
            const isMatch = await bcrypt.compare(password, DbUser[0].hashedPassword);
            console.log(isMatch);
            // If password matches
            if (isMatch) {

                // Add JWT Token( will expire in 24 hrs )
                console.log('jwt done start');
                const { firstName, lastName, email, mobile } = DbUser[0];
                const obj = { firstName, lastName, email, mobile };
                const token = await jwt.sign(obj, process.env.SECRET, { expiresIn: '24h' });
                console.log('jwt done end');

                res.cookie('accessToken', token);
                res.status(200);
                return res.json({ message: 'user login done' });
            } else {
                res.status(400);
                return res.json({ message: 'user login failed' });
            }
        } else {
            res.status(400);
            return res.json({ message: 'user not in DB' });
        }

    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})


/* -------------------Home Page Route----------------- */

// Home Page Route
router.get('/home', async (req, res) => {
    try {

        // Checking if cookie is in the request
        const { accessToken } = req.cookies;

        // if no cookies , then send no token found
        if (!accessToken) {
            res.status(400);
            return res.json({ message: 'no token' });
        }

        // Verifies whether it is a valid JWT token
        const decoded = jwt.verify(accessToken, process.env.SECRET);

        // If token is valid , then provide all questions to FE , else send a failed message
        if (decoded) {

            // Getting Questions from DB
            console.log('question find started');
            const Questions = await Question.find().exec();
            console.log('question find end');
            console.log(Questions);

            res.status(200);
            return res.send(Questions);
        } else {
            res.status(400);
            return res.json({ message: 'invalied token' });
        }
    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }

})


/* -------------------User Order Route----------------- */

// User order Route
router.post('/user/:customerEmail', async (req, res) => {
    try {

        // Taking total price ( yes + no ) to be 100

        const totalPrice = 100;

        // Checking if cookie is in the request
        const { accessToken } = req.cookies;

        // if no cookies , then send no token found
        if (!accessToken) {
            res.status(400);
            return res.json({ message: 'no token' });
        }

        const { customerEmail } = req.query;
        const { questionName, customerResponse, orderPrice, orderQuantity } = req.body;

        if (!customerEmail || !questionName || !customerResponse || !orderPrice || !orderQuantity) {
            res.status(400);
            return res.json({ message: 'missing or wrong credentials' });
        }


        // Verifies whether it is a valid JWT token
        const decoded = jwt.verify(accessToken, process.env.SECRET);


        // If token is valid , then provide all questions to FE , else send a failed message
        if (decoded) {


            

            // Creating order object for the new  customer
            const orderObject = {
                questionName,
                customerEmail,
                customerResponse,
                orderPrice,
                orderQuantity
            }

            // calling dynamicPrice function to update the price

            await dynamicPrice(customerResponse,orderQuantity,questionName);


            // Checking if for a particular question , opposite order is there which is pending for a match

            if (customerResponse === 'yes') {

                const oppositeOrder = await Order.findOne({
                    questionName,
                    "orderPrice": totalPrice - orderObject.orderPrice,
                    "customerResponse": 'no'
                }).exec();

                if (oppositeOrder) {

                    const oldOrderQuantity = oppositeOrder.orderQuantity;
                    const newOrderQuantity = orderObject.orderQuantity;

                    // if quantity of both old and new is same

                    if (oldOrderQuantity == newOrderQuantity) {

                        // delete the old order from Order DB

                        await Order.findByIdAndDelete(oppositeOrder._id).exec();


                        // update old user and update bidStatus as 'match'

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedUser = await User.findByIdAndUpdate(oldUser._id, { bids: Newbids }, { new: true });


                        // insert the bid in new user bids array with bidStatus as 'match'

                        const newUser = await User.findOne({ email: orderObject.customerEmail }).exec();

                        const NewUserbids = [
                            ...newUser.bids,
                            {
                                questionName: orderObject.questionName,
                                orderPrice: orderObject.orderPrice,
                                orderQuantity: orderObject.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedNewUser = await User.findByIdAndUpdate(newUser._id, { bids: NewUserbids }, { new: true });

                        res.status(200);
                        return res.json({ message: 'order match done' });

                    } else if (oldOrderQuantity > newOrderQuantity) {

                        // update the old order orderQuantity in DB

                        await Order.findByIdAndUpdate(oppositeOrder._id, {
                            "orderQuantity": oldOrderQuantity - newOrderQuantity
                        }, { new: true });


                        // update old user and update bidStatus as 'match'

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: orderObject.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedUser = await User.findByIdAndUpdate(oldUser._id, { bids: Newbids }, { new: true });


                        // insert the bid in new user bids array with bidStatus as 'match'

                        const newUser = await User.findOne({ email: orderObject.customerEmail }).exec();

                        const NewUserbids = [
                            ...newUser.bids,
                            {
                                questionName: orderObject.questionName,
                                orderPrice: orderObject.orderPrice,
                                orderQuantity: orderObject.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedNewUser = await User.findByIdAndUpdate(newUser._id, { bids: NewUserbids }, { new: true });

                        res.status(200);
                        return res.json({ message: 'order match done' });



                    } else {

                        // delete the old order from Order DB

                        await Order.findByIdAndDelete(oppositeOrder._id).exec();


                        // create order in Order DB for remaining quantities

                        const doc = new Order({
                            questionName: orderObject.questionName,
                            customerEmail: orderObject.customerEmail,
                            customerResponse: orderObject.customerResponse,
                            orderPrice: orderObject.orderPrice,
                            orderQuantity: orderObject.orderQuantity - oppositeOrder.orderQuantity
                        });

                        await doc.save();


                        // update old user and update bidStatus as 'match'

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedUser = await User.findByIdAndUpdate(oldUser._id, { bids: Newbids }, { new: true });


                        // insert the bid in new user bids array with bidStatus as 'match'

                        const newUser = await User.findOne({ email: orderObject.customerEmail }).exec();

                        const NewUserbids = [
                            ...newUser.bids,
                            {
                                questionName: orderObject.questionName,
                                orderPrice: orderObject.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedNewUser = await User.findByIdAndUpdate(newUser._id, { bids: NewUserbids }, { new: true });


                        res.status(200);
                        return res.json({
                            message: 'order partial match',
                            matchedQuantity: oppositeOrder.orderQuantity,
                            pendingQuantity: orderObject.orderQuantity - oppositeOrder.orderQuantity
                        });

                    }

                } else {

                    // create order in Order DB for all quantities

                    const doc = new Order({
                        questionName: orderObject.questionName,
                        customerEmail: orderObject.customerEmail,
                        customerResponse: orderObject.customerResponse,
                        orderPrice: orderObject.orderPrice,
                        orderQuantity: orderObject.orderQuantity
                    });

                    await doc.save();


                    res.status(200);
                    return res.json({ message: 'order unmatch' });
                }



            } else {

                const oppositeOrder = await Order.findOne({
                    questionName,
                    "orderPrice": totalPrice - orderObject.orderPrice,
                    "customerResponse": 'yes'
                }).exec();

                if (oppositeOrder) {

                    const oldOrderQuantity = oppositeOrder.orderQuantity;
                    const newOrderQuantity = orderObject.orderQuantity;

                    // if quantity of both old and new is same

                    if (oldOrderQuantity == newOrderQuantity) {

                        // delete the old order from Order DB

                        await Order.findByIdAndDelete(oppositeOrder._id).exec();


                        // update old user and update bidStatus as 'match'

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedUser = await User.findByIdAndUpdate(oldUser._id, { bids: Newbids }, { new: true });


                        // insert the bid in new user bids array with bidStatus as 'match'

                        const newUser = await User.findOne({ email: orderObject.customerEmail }).exec();

                        const NewUserbids = [
                            ...newUser.bids,
                            {
                                questionName: orderObject.questionName,
                                orderPrice: orderObject.orderPrice,
                                orderQuantity: orderObject.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedNewUser = await User.findByIdAndUpdate(newUser._id, { bids: NewUserbids }, { new: true });

                        res.status(200);
                        return res.json({ message: 'order match done' });

                    } else if (oldOrderQuantity > newOrderQuantity) {

                        // update the old order orderQuantity in DB

                        await Order.findByIdAndUpdate(oppositeOrder._id, {
                            "orderQuantity": oldOrderQuantity - newOrderQuantity
                        }, { new: true });


                        // update old user and update bidStatus as 'match'

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: orderObject.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedUser = await User.findByIdAndUpdate(oldUser._id, { bids: Newbids }, { new: true });


                        // insert the bid in new user bids array with bidStatus as 'match'

                        const newUser = await User.findOne({ email: orderObject.customerEmail }).exec();

                        const NewUserbids = [
                            ...newUser.bids,
                            {
                                questionName: orderObject.questionName,
                                orderPrice: orderObject.orderPrice,
                                orderQuantity: orderObject.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedNewUser = await User.findByIdAndUpdate(newUser._id, { bids: NewUserbids }, { new: true });

                        res.status(200);
                        return res.json({ message: 'order match done' });



                    } else {

                        // delete the old order from Order DB

                        await Order.findByIdAndDelete(oppositeOrder._id).exec();


                        // create order in Order DB for remaining quantities

                        const doc = new Order({
                            questionName: orderObject.questionName,
                            customerEmail: orderObject.customerEmail,
                            customerResponse: orderObject.customerResponse,
                            orderPrice: orderObject.orderPrice,
                            orderQuantity: orderObject.orderQuantity - oppositeOrder.orderQuantity
                        });

                        await doc.save();


                        // update old user and update bidStatus as 'match'

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedUser = await User.findByIdAndUpdate(oldUser._id, { bids: Newbids }, { new: true });


                        // insert the bid in new user bids array with bidStatus as 'match'

                        const newUser = await User.findOne({ email: orderObject.customerEmail }).exec();

                        const NewUserbids = [
                            ...newUser.bids,
                            {
                                questionName: orderObject.questionName,
                                orderPrice: orderObject.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedNewUser = await User.findByIdAndUpdate(newUser._id, { bids: NewUserbids }, { new: true });


                        res.status(200);
                        return res.json({
                            message: 'order partial match',
                            matchedQuantity: oppositeOrder.orderQuantity,
                            pendingQuantity: orderObject.orderQuantity - oppositeOrder.orderQuantity
                        });

                    }

                } else {

                    // create order in Order DB for all quantities

                    const doc = new Order({
                        questionName: orderObject.questionName,
                        customerEmail: orderObject.customerEmail,
                        customerResponse: orderObject.customerResponse,
                        orderPrice: orderObject.orderPrice,
                        orderQuantity: orderObject.orderQuantity
                    });

                    await doc.save();


                    res.status(200);
                    return res.json({ message: 'order unmatch' });
                }
            }


        } else {
            res.status(400);
            return res.json({ message: 'invalied token' });
        }



    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})



/* --------------Admin Panel Routes------------------- */


// To get all Questions from DB

router.get('/admin/qsn', async (req, res) => {
    try {
        // Get all questions from user DB
        console.log('question find started');
        const Questions = await Question.find().exec();
        console.log('question find end');
        console.log(Questions);
        res.status(200);
        return res.send(Questions);

    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})


// To Create a Question in DB

router.post('/admin/qsn', async (req, res) => {
    try {

        // Create a question in DB
        const qsn = new Question(req.body);
        await qsn.save();

        res.status(201);
        return res.json({ message: 'question created' });

    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})


// Delete all questions from DB

router.get('/admin/qsn/delete', async (req, res) => {
    try {

        // Delete all items in Question DB
        await Question.deleteMany();

        res.status(200);
        return res.json({ message: 'questions deleted' });

    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})



// To get all users from DB

router.get('/admin/user', async (req, res) => {
    try {
        // Get all users from user DB
        const Users = await User.find();

        res.status(200);
        res.send(Users);

    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})


module.exports = router;