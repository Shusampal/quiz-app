const Question = require('../models/question');
const Order = require('../models/order');
const User = require('../models/user');

const cancelOrder = async (oppositeOrder, orderObject, customerResponse) => {

    if (customerResponse) {

        if (oppositeOrder) {

            const oldOrderQuantity = oppositeOrder.orderQuantity;
            const newOrderQuantity = orderObject.orderQuantity;

            // if quantity of both old and new is same

            if (oldOrderQuantity == newOrderQuantity) {


                console.log("CANCELLED CALLED");

                console.log(oppositeOrder);

                console.log(orderObject);

                // delete the old order from Order DB


                console.log("DELETING");

                const query = {
                    questionName: oppositeOrder.questionName,
                    customerEmail: oppositeOrder.customerEmail,
                    customerResponse: oppositeOrder.customerResponse,
                    orderPrice: oppositeOrder.orderPrice,
                    orderQuantity: oppositeOrder.orderQuantity,
                    cancel: true
                }

                await Order.findOneAndDelete(query).exec();
                console.log("DELETED");


                // update old user and insert in  bids array in User model


                console.log("GETTING OLD USER");

                const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();

                console.log("GOT OLD USER");


                // update the wallet of old user

                // 1. first fetch the question object from Question model


                console.log("GOT OLD USER QUESTION");

                const question = await Question.findOne({ name: oppositeOrder.questionName }).exec();

                console.log("GOT OLD USER QUESTION");

                let value;

                if (oppositeOrder.customerResponse === 'yes') {
                    value = question.yesValue;
                } else {
                    value = question.noValue;
                }

                console.log("VALUE IS : ", value);

                // 2. Calculate amount to be added in user wallet
                const walletAmountToBeUpdated = value * (oppositeOrder.orderQuantity);


                console.log("walletAmountToBeUpdated IS : ", walletAmountToBeUpdated);

                // 3. add wallet amount in the user


                const newWallet = oldUser.wallet + walletAmountToBeUpdated;

                await User.findByIdAndUpdate(oldUser._id, { wallet: newWallet }, { new: true });


                console.log("old user wallet is updated");


                // update new user and insert in bids array in User model

                const newUser = await User.findOne({ email: orderObject.customerEmail }).exec();

                const Newbids = [
                    ...newUser.bids,
                    {
                        questionName: orderObject.questionName,
                        orderPrice: orderObject.orderPrice,
                        orderQuantity: orderObject.orderQuantity,
                        orderResponse: orderObject.customerResponse,
                        orderStatus: 'match'

                    }

                ]

                const updatedUser = await User.findByIdAndUpdate({ _id: newUser._id }, { bids: Newbids }, { new: true });


                console.log("NEW USER BID ARRAY IS UPDATED");



            }

        }

    }


    return;



}


module.exports = cancelOrder;