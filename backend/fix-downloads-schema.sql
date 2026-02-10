-- Add missing torrent_hash column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='downloads' AND column_name='torrent_hash') THEN
        ALTER TABLE downloads ADD COLUMN torrent_hash TEXT UNIQUE;
        
        -- Migrate data from old column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='downloads' AND column_name='torrent_id') THEN
            UPDATE downloads SET torrent_hash = torrent_id WHERE torrent_id IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Add missing name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='downloads' AND column_name='name') THEN
        ALTER TABLE downloads ADD COLUMN name TEXT;
    END IF;
END $$;

-- Add missing error column if it doesn't exist (old schema has error_message)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='downloads' AND column_name='error') THEN
        ALTER TABLE downloads ADD COLUMN error TEXT;
        
        -- Migrate from old column
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='downloads' AND column_name='error_message') THEN
            UPDATE downloads SET error = error_message WHERE error_message IS NOT NULL;
        END IF;
    END IF;
END $$;
