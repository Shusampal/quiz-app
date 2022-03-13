const Question = require('../models/question');

const cancelOrder = async (oppositeOrder, orderObject, customerResponse) => {

    if (customerResponse) {

        if (oppositeOrder) {

            const oldOrderQuantity = oppositeOrder.orderQuantity;
            const newOrderQuantity = orderObject.orderQuantity;

            // if quantity of both old and new is same

            if (oldOrderQuantity == newOrderQuantity) {

                // delete the old order from Order DB

                await Order.findByIdAndDelete(oppositeOrder._id).exec();


                // update old user and insert in  bids array in User model

                const oldUser = await User.findOne({ email: oppositeOrder.customerEmail }).exec();


                // update the wallet of old user

                // 1. first fetch the question object from Question model

                const question = await Question.findOne({ name: oppositeOrder.questionName }).exec();

                let value;

                if (oppositeOrder.customerResponse === 'yes') {
                    value = question.yesValue;
                } else {
                    value = question.noValue;
                }


                // 2. Calculate amount to be added in user wallet
                const walletAmountToBeUpdated = value * (oppositeOrder.orderQuantity);


                // 3. add wallet amount in the user


                const newWallet = oldUser.wallet + walletAmountToBeUpdated;

                await findByIdAndUpdate(oldUser._id, { wallet: newWallet }, { new: true });




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

                const updatedUser = await User.findByIdAndUpdate(newUser._id, { bids: Newbids }, { new: true });

                res.status(200);
                return res.json({ message: 'order match done' });


            }

        }

    }



}


module.exports = cancelOrder;