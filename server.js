const express = require("express");
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config()

const app = express();

//connect db
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true
})
.then(() => console.log('DB connected'))
.catch(err => console.log('DB CONNECTION ERROR: ',err))

//import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

//app middlewares
app.use(morgan('dev'));
app.use(bodyParser.json());
//app.use(cors());
if(process.env.NODE_ENV = 'development'){
    app.use(cors({origin: process.env.CLIENT_URL}))
}

//middleware
app.use('/api',authRoutes);
app.use('/api',userRoutes);


const port = process.env.PORT || 5000
app.listen(port, () => {
    console.log(`API is running on port ${port} - ${process.env.NODE_ENV}`)
})