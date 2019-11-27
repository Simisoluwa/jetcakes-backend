const express = require("express");

const app = express();

app.get('/api/signup', (req,res) => {
    res.json({
        data: 'you hit the sign up endpoint'
    })
})

const port = process.env.PORT || 5000
app.listen(port, () => {
    console.log(`API is running on port ${port}`)
})