-- SQL migration to create the User table matching the previous Prisma schema
CREATE TABLE IF NOT EXISTS "User" (
    id UUID PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(50),
    username VARCHAR(255),
    password VARCHAR(255), -- Added password field
    role VARCHAR(20) NOT NULL DEFAULT 'fan', -- Added role field for creator/fan
    bio TEXT,
    avatar VARCHAR(255),
    alias VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "UserConnection" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_user_id)
); 