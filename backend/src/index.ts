import express from 'express'
import { drizzle } from 'drizzle-orm/node-postgres';
import 'dotenv/config';


const app = express()
app.use(express.json())

const PORT: number = 5000

app.listen(PORT, () => {
    console.log(`Sever running on ${PORT}`)
})

app.get('/', (req, res) => {
    res.send("Server started")
})

const db = drizzle(process.env.DATABASE_URL!);
