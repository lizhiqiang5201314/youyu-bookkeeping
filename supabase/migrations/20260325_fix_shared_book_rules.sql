-- 修复共享账本的核心约束：
-- 1. 创建共享账本时自动补 OWNER 成员
-- 2. 一个用户同类型（情侣/家庭）共享账本只能拥有或加入一个
-- 3. 情侣账本最多 2 人，家庭账本最多 5 人
-- 4. 账本已满时不能再创建邀请码

CREATE OR REPLACE FUNCTION auto_add_book_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type IN ('COUPLE', 'FAMILY') AND NEW.created_by IS NOT NULL THEN
        INSERT INTO book_members (book_id, user_id, role, joined_at)
        VALUES (NEW.id, NEW.created_by, 'OWNER', COALESCE(NEW.created_at, NOW()))
        ON CONFLICT (book_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_add_owner ON books;

CREATE TRIGGER trigger_auto_add_owner
    AFTER INSERT ON books
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_book_owner();

CREATE OR REPLACE FUNCTION validate_shared_book_creation()
RETURNS TRIGGER AS $$
DECLARE
    conflicting_book_id UUID;
BEGIN
    IF NEW.type NOT IN ('COUPLE', 'FAMILY') OR NEW.created_by IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT b.id
      INTO conflicting_book_id
      FROM books b
      LEFT JOIN book_members bm
        ON bm.book_id = b.id
       AND bm.user_id = NEW.created_by
     WHERE b.type = NEW.type
       AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
       AND (b.created_by = NEW.created_by OR bm.user_id = NEW.created_by)
     LIMIT 1;

    IF conflicting_book_id IS NOT NULL THEN
        RAISE EXCEPTION 'shared_book_same_type_exists';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_shared_book_creation ON books;

CREATE TRIGGER trigger_validate_shared_book_creation
    BEFORE INSERT OR UPDATE OF type, created_by ON books
    FOR EACH ROW
    EXECUTE FUNCTION validate_shared_book_creation();

CREATE OR REPLACE FUNCTION validate_shared_book_membership()
RETURNS TRIGGER AS $$
DECLARE
    target_book_type TEXT;
    target_book_owner UUID;
    max_members INTEGER;
    current_member_count INTEGER;
    conflicting_book_id UUID;
BEGIN
    SELECT type, created_by
      INTO target_book_type, target_book_owner
      FROM books
     WHERE id = NEW.book_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'shared_book_not_found';
    END IF;

    IF target_book_type = 'PERSONAL' AND NEW.user_id <> target_book_owner THEN
        RAISE EXCEPTION 'personal_book_cannot_add_members';
    END IF;

    IF target_book_type = 'COUPLE' THEN
        max_members := 2;
    ELSIF target_book_type = 'FAMILY' THEN
        max_members := 5;
    ELSE
        max_members := 1;
    END IF;

    SELECT COUNT(*)
      INTO current_member_count
      FROM book_members
     WHERE book_id = NEW.book_id
       AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

    IF current_member_count >= max_members THEN
        RAISE EXCEPTION 'shared_book_member_limit_reached';
    END IF;

    IF target_book_type IN ('COUPLE', 'FAMILY') THEN
        SELECT b.id
          INTO conflicting_book_id
          FROM books b
          LEFT JOIN book_members bm
            ON bm.book_id = b.id
           AND bm.user_id = NEW.user_id
         WHERE b.type = target_book_type
           AND b.id <> NEW.book_id
           AND (b.created_by = NEW.user_id OR bm.user_id = NEW.user_id)
         LIMIT 1;

        IF conflicting_book_id IS NOT NULL THEN
            RAISE EXCEPTION 'shared_book_same_type_exists';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_shared_book_membership ON book_members;

CREATE TRIGGER trigger_validate_shared_book_membership
    BEFORE INSERT OR UPDATE OF book_id, user_id ON book_members
    FOR EACH ROW
    EXECUTE FUNCTION validate_shared_book_membership();

CREATE OR REPLACE FUNCTION validate_shared_book_invite()
RETURNS TRIGGER AS $$
DECLARE
    target_book_type TEXT;
    max_members INTEGER;
    current_member_count INTEGER;
BEGIN
    SELECT type
      INTO target_book_type
      FROM books
     WHERE id = NEW.book_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'shared_book_not_found';
    END IF;

    IF target_book_type = 'PERSONAL' THEN
        RAISE EXCEPTION 'personal_book_cannot_invite';
    END IF;

    IF target_book_type = 'COUPLE' THEN
        max_members := 2;
    ELSE
        max_members := 5;
    END IF;

    SELECT COUNT(*)
      INTO current_member_count
      FROM book_members
     WHERE book_id = NEW.book_id;

    IF current_member_count >= max_members THEN
        RAISE EXCEPTION 'shared_book_member_limit_reached';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_shared_book_invite ON book_invites;

CREATE TRIGGER trigger_validate_shared_book_invite
    BEFORE INSERT ON book_invites
    FOR EACH ROW
    EXECUTE FUNCTION validate_shared_book_invite();
