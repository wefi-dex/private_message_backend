import { Request, Response } from 'express'
import asyncHandler from '../middleware/asyncHandler'
import pool from '../../util/postgre'
import { logger } from '../../util/logger'

// Get fan feed - posts from creators the fan follows
export const getFanFeed = asyncHandler(async (req: Request, res: Response) => {
  let fanId = req.user?.id

  if (!fanId) {
    fanId = '54dea192-841b-49ed-a812-d5386daf13b0' // Test fan ID
  }

  try {
    // For testing: Create some sample posts if none exist
    const checkPostsQuery = 'SELECT COUNT(*) FROM creator_posts'
    const postsCount = await pool.query(checkPostsQuery)

    if (parseInt(postsCount.rows[0].count) === 0) {
      // Create sample posts
      const samplePosts = [
        {
          creatorId: 'test-creator-1',
          creatorUsername: 'testcreator1',
          creatorAlias: 'Test Creator 1',
          title: 'Welcome to my feed!',
          content: 'This is my first post. Hope you enjoy the content!',
          image_url: 'https://picsum.photos/400/300?random=1',
        },
        {
          creatorId: 'test-creator-2',
          creatorUsername: 'testcreator2',
          creatorAlias: 'Test Creator 2',
          title: 'Behind the scenes',
          content: 'Working on some exciting new content for you all.',
          video_url:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        },
        {
          creatorId: 'test-creator-3',
          creatorUsername: 'testcreator3',
          creatorAlias: 'Test Creator 3',
          title: 'Daily thoughts',
          content:
            'Just sharing some thoughts about creativity and inspiration.',
        },
        {
          creatorId: 'test-creator-4',
          creatorUsername: 'testcreator4',
          creatorAlias: 'Test Creator 4',
          title: 'Creative process',
          content:
            "Here's how I approach my creative projects and what inspires me.",
          image_url: 'https://picsum.photos/400/300?random=2',
        },
        {
          creatorId: 'test-creator-5',
          creatorUsername: 'testcreator5',
          creatorAlias: 'Test Creator 5',
          title: 'Community update',
          content:
            "Thank you all for the amazing support! Here's what's coming next.",
        },
      ]

      for (const post of samplePosts) {
        // Create creator if doesn't exist
        const creatorQuery = `
          INSERT INTO "User" (id, username, email, password_hash, role, alias, bio, avatar, created_at)
          VALUES (
            $1,
            $2,
            $3,
            'hashed_password',
            'creator',
            $4,
            'A test creator for fan feed',
            $5,
            NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `

        // Use better avatar URLs for each creator
        const avatarUrls = [
          'https://picsum.photos/150/150?random=1',
          'https://picsum.photos/150/150?random=2',
          'https://picsum.photos/150/150?random=3',
          'https://picsum.photos/150/150?random=4',
          'https://picsum.photos/150/150?random=5',
        ]

        const avatarIndex = parseInt(post.creatorId.split('-')[2]) - 1 // Extract number from creator ID
        const avatarUrl = avatarUrls[avatarIndex] || avatarUrls[0]

        await pool.query(creatorQuery, [
          post.creatorId,
          post.creatorUsername,
          `${post.creatorUsername}@test.com`,
          post.creatorAlias,
          avatarUrl,
        ])

        // Create post
        await pool.query(
          `
          INSERT INTO creator_posts (id, creator_id, title, content, image_url, video_url, created_at, is_premium)
          VALUES (
            gen_random_uuid(),
            $1,
            $2,
            $3,
            $4,
            $5,
            NOW(),
            false
          )
        `,
          [
            post.creatorId,
            post.title,
            post.content,
            post.image_url || null,
            post.video_url || null,
          ],
        )
      }
    } else {
      // Clean up existing posts with invalid audio URLs
      const cleanupQuery = `
        UPDATE creator_posts
        SET audio_url = NULL
        WHERE audio_url IS NOT NULL
        AND (
          audio_url = ''
          OR audio_url LIKE '%test%'
          OR audio_url LIKE '%sample%'
          OR audio_url NOT LIKE 'http%'
        )
      `
      await pool.query(cleanupQuery)

      // Update existing creators with proper avatars if they don't have them
      // Get all creators that need avatar updates
      const getCreatorsQuery = `
        SELECT id, username FROM "User"
        WHERE role = 'creator'
        AND (avatar IS NULL OR avatar = '' OR avatar LIKE '%placeholder%')
        ORDER BY created_at
      `
      const creatorsResult = await pool.query(getCreatorsQuery)
      const creators = creatorsResult.rows

      const avatarUrls = [
        'https://picsum.photos/150/150?random=1',
        'https://picsum.photos/150/150?random=2',
        'https://picsum.photos/150/150?random=3',
        'https://picsum.photos/150/150?random=4',
        'https://picsum.photos/150/150?random=5',
      ]

      // Update each creator with a different avatar
      for (let i = 0; i < creators.length; i++) {
        const creator = creators[i]
        const avatarUrl = avatarUrls[i % avatarUrls.length] // Cycle through avatars
        const updateAvatarQuery = `UPDATE "User" SET avatar = $1 WHERE id = $2`
        await pool.query(updateAvatarQuery, [avatarUrl, creator.id])
      }
    }

    // Get posts from creators that the fan follows
    const feedQuery = `
      SELECT
        p.id,
        p.creator_id,
        u.username as creator_username,
        u.alias as creator_alias,
        u.avatar as creator_avatar,
        false as creator_is_verified,
        p.title,
        p.content,
        p.image_url,
        p.video_url,
        p.audio_url,
        p.created_at,
        COALESCE(pl_count.count, 0) as likes_count,
        COALESCE(pc_count.count, 0) as comments_count,
        p.is_premium,
        CASE WHEN pl.post_id IS NOT NULL THEN true ELSE false END as is_liked,
        CASE WHEN f.follower_id IS NOT NULL THEN true ELSE false END as is_following
      FROM creator_posts p
      INNER JOIN "User" u ON p.creator_id = u.id
      LEFT JOIN followers f ON p.creator_id = f.creator_id AND f.follower_id = $1
      LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = $1
      LEFT JOIN (
        SELECT post_id, COUNT(*) as count
        FROM post_likes
        GROUP BY post_id
      ) pl_count ON p.id = pl_count.post_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as count
        FROM post_comments
        GROUP BY post_id
      ) pc_count ON p.id = pc_count.post_id
      WHERE u.role = 'creator'
      ORDER BY p.created_at DESC
      LIMIT 50
    `

    const feedResult = await pool.query(feedQuery, [fanId])
    const feedPosts = feedResult.rows

    res.json({
      success: true,
      data: feedPosts,
    })
  } catch (error: any) {
    logger.error('Fan feed error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get fan feed',
    })
  }
})

// Follow a creator
export const followCreator = asyncHandler(
  async (req: Request, res: Response) => {
    let fanId = req.user?.id
    const { creatorId } = req.params

    if (!fanId) {
      fanId = '54dea192-841b-49ed-a812-d5386daf13b0' // Test fan ID
    }

    if (!creatorId) {
      return res
        .status(400)
        .json({ success: false, message: 'Creator ID is required' })
    }

    try {
      // Check if already following
      const existingFollowQuery =
        'SELECT * FROM followers WHERE follower_id = $1 AND creator_id = $2'
      const existingFollow = await pool.query(existingFollowQuery, [
        fanId,
        creatorId,
      ])

      if (existingFollow.rows.length > 0) {
        return res.json({
          success: true,
          message: 'Already following this creator',
          isFollowing: true,
        })
      }

      // Add follow relationship
      const followQuery =
        'INSERT INTO followers (follower_id, creator_id, created_at) VALUES ($1, $2, NOW())'
      await pool.query(followQuery, [fanId, creatorId])

      res.json({
        success: true,
        message: 'Successfully followed creator',
        isFollowing: true,
      })
    } catch (error: any) {
      logger.error('Follow creator error:', error)
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to follow creator',
      })
    }
  },
)

// Unfollow a creator
export const unfollowCreator = asyncHandler(
  async (req: Request, res: Response) => {
    let fanId = req.user?.id
    const { creatorId } = req.params

    if (!fanId) {
      fanId = '54dea192-841b-49ed-a812-d5386daf13b0' // Test fan ID
    }

    if (!creatorId) {
      return res
        .status(400)
        .json({ success: false, message: 'Creator ID is required' })
    }

    try {
      // Check if following
      const existingFollowQuery =
        'SELECT * FROM followers WHERE follower_id = $1 AND creator_id = $2'
      const existingFollow = await pool.query(existingFollowQuery, [
        fanId,
        creatorId,
      ])

      if (existingFollow.rows.length === 0) {
        return res.json({
          success: true,
          message: 'Not following this creator',
          isFollowing: false,
        })
      }

      // Remove follow relationship
      const unfollowQuery =
        'DELETE FROM followers WHERE follower_id = $1 AND creator_id = $2'
      await pool.query(unfollowQuery, [fanId, creatorId])

      res.json({
        success: true,
        message: 'Successfully unfollowed creator',
        isFollowing: false,
      })
    } catch (error: any) {
      logger.error('Unfollow creator error:', error)
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to unfollow creator',
      })
    }
  },
)

// Get creators that a fan follows
export const getFollowedCreators = asyncHandler(
  async (req: Request, res: Response) => {
    // For testing purposes, allow using a test fan ID if no user is authenticated
    let fanId = req.user?.id

    if (!fanId) {
      // Use a test fan ID for development/testing
      fanId = '54dea192-841b-49ed-a812-d5386daf13b0'
    }

    try {
      const creatorsQuery = `
      SELECT
        u.id,
        u.username,
        u.alias,
        u.bio,
        u.avatar,
        u.followers_count,
        u.posts_count,
        false as is_verified,
        f.created_at as followed_at
      FROM followers f
      INNER JOIN "User" u ON f.creator_id = u.id
      WHERE f.follower_id = $1 AND u.role = 'creator'
      ORDER BY f.created_at DESC
    `

      const creatorsResult = await pool.query(creatorsQuery, [fanId])
      const followedCreators = creatorsResult.rows

      res.json({
        success: true,
        data: followedCreators,
      })
    } catch (error: any) {
      logger.error('Get followed creators error:', error)
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get followed creators',
      })
    }
  },
)
