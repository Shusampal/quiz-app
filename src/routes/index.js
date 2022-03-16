const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Question = require('../models/question');
const Order = require('../models/order');
const dynamicPrice = require('../helpers/dynamicPrice');
const cancelOrder = require('../helpers/cancelOrder');
const isQuestionExpired = require('../helpers/isQuestionExpired');
const { findByIdAndUpdate } = require('../models/user');
require('dotenv').config();

const upload = multer({ dest: 'uploads/' });

// Test Page
router.get('/', (req, res) => {

    res.status(200);
    return res.json({
        "message": "I am working Fine",
        "Server Date": new Date().toLocaleDateString().toString(),
        "Server hour": new Date().getHours().toString(),
        "Server min": new Date().getMinutes().toString()

    });
})


/* -------------------Signup and Sign in Routes----------------- */

// Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password, mobile, gender } = req.body;

        // Initial validation of body
        if (!email || !password || !mobile || !firstName || !lastName || !gender) {
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
                gender,
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
                console.log(DbUser[0]);
                const { firstName, lastName, email, mobile } = DbUser[0];
                const obj = { firstName, lastName, email, mobile };
                const token = await jwt.sign(obj, process.env.SECRET, { expiresIn: '24h' });
                console.log('jwt done end');

                const userObj = {
                    firstName: DbUser[0].firstName,
                    lastName: DbUser[0].lastName,
                    email: DbUser[0].email,
                    mobile: DbUser[0].mobile,
                    gender: DbUser[0].gender,
                    wallet: DbUser[0].wallet,
                    kyc: DbUser[0].kyc,
                    bids: DbUser[0].bids
                }
                res.cookie('accessToken', token);
                res.cookie('email', DbUser[0].email);
                res.status(200);
                return res.json({ message: 'user login done', userObj });
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


// To get a user detail

router.get('/user', (req, res) => {
    try {
        // Checking if cookie is in the request
        const { accessToken, email } = req.cookies;

        // if no cookies , then send no token found
        if (!accessToken || !email) {
            res.status(400);
            return res.json({ message: 'no token or mail' });
        }

        // Verifies whether it is a valid JWT token
        const decoded = jwt.verify(accessToken, process.env.SECRET);

        // If token is valid , then provide user detail

        if (decoded) {

            // Getting User from DB
            console.log('user find started');
            const user = await User.findOne({ email }).lean();
            console.log('user find end');
            console.log(user);

            res.status(200);
            return res.send(user);
        } else {
            res.status(400);
            return res.json({ message: 'invalied token' });
        }


    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})

/* -------------------User KYC Route------------------ */


router.post('/kyc', upload.single('avatar'), async (req, res) => {
    try {

        console.log("kyc is hit");

        const { userName, dateOfBirth, panNumber } = req.body;

        // Initial validation of body
        if (!userName || !dateOfBirth || !panNumber) {
            res.status(400);
            return res.json({ message: 'missing or wrong credentials' });
        }

        // Checking if cookie is in the request
        const { accessToken, email } = req.cookies;

        // if no cookies , then send no token found
        if (!accessToken) {
            res.status(400);
            return res.json({ message: 'no token' });
        }

        // Verifies whether it is a valid JWT token
        const decoded = jwt.verify(accessToken, process.env.SECRET);

        console.log("Decoded", decoded);

        if (decoded) {

            console.log("user fetching");
            const user = await User.findOne({ email }).exec();
            console.log("user fetched");

            // Update user in DB

            const newKyc = {
                ...req.body
            }

            await User.findByIdAndUpdate({ _id: user._id }, { kyc: newKyc }).exec();
            res.status(200);
            return res.json({ message: 'kyc done' });


        } else {
            res.status(400);
            return res.json({ message: 'invalied token' });
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
            const Questions = await Question.find().lean();
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


/* -------------------User Order and Cancel Route----------------- */

// User order Route
router.post('/user/order', async (req, res) => {
    try {


        // checking if question is expired or not 

        const isExpired = await isQuestionExpired(req.body.questionName);

        console.log(isExpired);

        if (isExpired === true) {
            console.log(isExpired);
            res.status(400);
            return res.json({ "message": " question time expired" });
        }

        console.log("outside");

        // Taking total price ( yes + no ) to be 100

        const totalPrice = 100;

        // Checking if cookie is in the request
        const { accessToken } = req.cookies;

        // if no cookies , then send no token found
        if (!accessToken) {
            res.status(400);
            return res.json({ message: 'no token' });
        }

        console.log(req.params);
        console.log(req.body);
        const customerEmail = req.cookies.email;
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

            await dynamicPrice(customerResponse, orderQuantity, questionName);


            // Deleting order value from new customer wallet

            const orderUser = await User.findOne({ email: customerEmail }).exec();

            const dbWallet = orderUser.wallet;

            const orderValue = orderPrice * orderQuantity;

            if (orderValue > dbWallet) {
                res.status(400);
                return res.json({ message: "Wallet balance not sufficient" });
            } else {
                const newWallet = dbWallet - orderValue;
                await User.findByIdAndUpdate({ _id: orderUser._id }, { wallet: newWallet }).exec();
            }
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

                        // checking if old order from DB is cancelled order initiated or not

                        if (oppositeOrder.cancel === true) {
                            await cancelOrder(oppositeOrder, orderObject, customerResponse);
                            res.status(200);
                            return res.json({ message: 'order match done' });

                        }

                        // delete the old order from Order DB

                        await Order.findByIdAndDelete(oppositeOrder._id).exec();


                        // update old user and insert in  bids array in User model

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderResponse: oppositeOrder.customerResponse,
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
                                orderResponse: orderObject.customerResponse,
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


                        // update old user and insert in  bids array in User model

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: orderObject.orderQuantity,
                                orderResponse: oppositeOrder.customerResponse,
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
                                orderResponse: orderObject.customerResponse,
                                orderStatus: 'match'

                            }

                        ]

                        const updatedNewUser = await User.findByIdAndUpdate(newUser._id, { bids: NewUserbids }, { new: true });

                        res.status(200);
                        return res.json({ message: 'order match done' });



                    } else {

                        // delete the old order from Order DB

                        await Order.findByIdAndDelete(oppositeOrder._id).exec();


                        // create order in Order DB for remaining quantities for new customer

                        const doc = new Order({
                            questionName: orderObject.questionName,
                            customerEmail: orderObject.customerEmail,
                            customerResponse: orderObject.customerResponse,
                            orderPrice: orderObject.orderPrice,
                            orderQuantity: orderObject.orderQuantity - oppositeOrder.orderQuantity
                        });

                        await doc.save();


                        // update old user and insert in  bids array in User model.

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderResponse: oppositeOrder.customerResponse,
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
                                orderResponse: orderObject.customerResponse,
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

                        // checking if old order from DB is cancelled order initiated or not

                        if (oppositeOrder.cancel === true) {
                            await cancelOrder(oppositeOrder, orderObject, customerResponse);
                            res.status(200);
                            return res.json({ message: 'order match done' });

                        }

                        // delete the old order from Order DB

                        await Order.findByIdAndDelete(oppositeOrder._id).exec();


                        // update old user and insert in  bids array in User model

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderResponse: oppositeOrder.customerResponse,
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
                                orderResponse: orderObject.customerResponse,
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


                        // update old user and insert in  bids array in User model.

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: orderObject.orderQuantity,
                                orderResponse: oppositeOrder.customerResponse,
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
                                orderResponse: orderObject.customerResponse,
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


                        // update old user and insert in  bids array in User model.

                        const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                        const Newbids = [
                            ...oldUser.bids,
                            {
                                questionName: oppositeOrder.questionName,
                                orderPrice: oppositeOrder.orderPrice,
                                orderQuantity: oppositeOrder.orderQuantity,
                                orderResponse: oppositeOrder.customerResponse,
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
                                orderResponse: orderObject.customerResponse,
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



// User order cancel Route
router.post('/user/cancel', async (req, res) => {
    try {

        // checking if question is expired or not 

        const isExpired = await isQuestionExpired(req.body.questionName);

        console.log(isExpired);

        if (isExpired === true) {
            console.log(isExpired);
            res.status(400);
            return res.json({ "message": " question time expired" });
        }

        console.log("outside");

        // Taking total price ( yes + no ) to be 100

        const totalPrice = 100;

        // Checking if cookie is in the request
        const { accessToken } = req.cookies;

        // if no cookies , then send no token found
        if (!accessToken) {
            res.status(400);
            return res.json({ message: 'no token' });
        }

        console.log(req.params);
        console.log(req.body);
        const customerEmail = req.cookies.email;
        const { questionName, customerResponse, orderPrice, orderQuantity, cancel } = req.body;

        if (!customerEmail || !questionName || !customerResponse || !orderPrice || !orderQuantity || !cancel) {
            res.status(400);
            return res.json({ message: 'missing or wrong credentials' });
        }


        // Verifies whether it is a valid JWT token
        const decoded = jwt.verify(accessToken, process.env.SECRET);


        // If token is valid , then provide all questions to FE , else send a failed message

        if (decoded) {

            console.log("Is Decoded");

            // Creating order object for the new  customer
            const orderObject = {
                questionName,
                customerEmail,
                customerResponse,
                orderPrice,
                orderQuantity
            }

            // calling dynamicPrice function to update the price

            console.log("calling dynamic price");

            await dynamicPrice(customerResponse, orderQuantity, questionName);

            console.log("called dynamic price");


            // New Customer Pending order update from Order model ( put cancel : true )
            await Order.findOneAndUpdate(orderObject, { cancel: true }).exec();


            res.status(200);
            return res.json({ message: 'cancel order initiated' });



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
        const Questions = await Question.find().lean();
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

        console.log(req.body);

        console.log(typeof req.body.expiryDate);
        console.log(typeof req.body.expiryTime);


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


// To update the wallet of a User in DB

router.post('/admin/user', async (req, res) => {
    try {

        // Create a question in DB

        console.log(req.body);

        const { email, updateAmount } = req.body;


        // find the user in DB

        const user = await User.findOne({ email }).exec();

        const oldWallet = user.wallet;

        const newWallet = oldWallet + updateAmount;

        // update the wallet in DB

        await findByIdAndUpdate({ _id: user._id }, { wallet: newWallet }).exec();

        res.status(201);
        return res.json({ message: 'wallet updated' });

    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})


// To get all users who have bidded for a particular question

router.post('/result', async (req, res) => {
    try {

        // Create a question in DB

        console.log(req.body);

        const { name } = req.body;


        // find the question in DB

        const qsn = await Question.findOne({ name }).exec();


        // find all users who have bidded for a particular qsn

        const AllUsers = await User.find({}).lean();

        console.log("ALLUsers");


        let biddedUsers = [];


        for (let user of AllUsers) {
            console.log("user is =====> ", JSON.stringify(user));

            const bidsArray = user.bids;

            const orders = await bidsArray.filter(bid => bid.questionName === name);

            const object = {
                "user email": user.email,
                "user mobile": user.mobile,
                "user orders": orders
            }

            biddedUsers.push(object);
        }

        res.status(201);
        return res.json(biddedUsers);

    } catch (error) {
        res.status(500);
        return res.json({ message: 'server error' });
    }
})


module.exports = router;