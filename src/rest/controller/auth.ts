import { Request, Response } from 'express'
import asyncHandler from '../middleware/asyncHandler'
import jwt from 'jsonwebtoken'
import pool from '../../util/postgre'
import bcrypt from 'bcrypt'
import { config } from '../../config'

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' }) as Response
  }

  const userResult = await pool.query('SELECT * FROM "User" WHERE username = $1', [username])
  if (userResult.rows.length === 0) {
    return res.status(401).json({ message: 'Invalid username or password.' }) as Response
  }
  const user = userResult.rows[0]

  // Check if user is banned
  if (user.banned) {
    return res.status(403).json({ message: 'Your account has been banned. Please contact support for more information.' }) as Response
  }

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid username or password.' }) as Response
  }

  const secretKey = config.jwt.secret
  const options = { expiresIn: '1h' }
  const payload = { id: user.id, username: user.username }
  const token = jwt.sign(payload, secretKey, options)

  // Exclude password and pass avatar as string
  const { password: userPassword, ...userWithoutPassword } = user;
  // avatar is now a string (URL or null)
  res.status(200).json({ token, user: userWithoutPassword }) as Response
})
