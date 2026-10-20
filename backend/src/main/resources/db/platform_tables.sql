-- MPMS 平台自有表（与 Teamcenter 原生 p* 表区分，批量迁移重刷业务表时不受影响）
-- 首次执行：2026-10-15

-- 1. 平台用户认证扩展表：与 public.ppom_user 按 user_puid 1:1 关联
--    密码直接复用 Teamcenter PPOM_USER.PNEWPASSWORD 的 $2a$07$ bcrypt 哈希
CREATE TABLE IF NOT EXISTS public.local_user_auth (
    user_puid        VARCHAR(60) PRIMARY KEY,
    puser_id         VARCHAR(128) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    role_code        VARCHAR(64)  NOT NULL DEFAULT 'ENGINEER',
    is_enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    failed_attempts  INTEGER      NOT NULL DEFAULT 0,
    locked_until     TIMESTAMP,
    last_login_at    TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. 平台安全与操作审计日志
CREATE TABLE IF NOT EXISTS public.local_audit_log (
    id               BIGSERIAL PRIMARY KEY,
    event_time       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_puid        VARCHAR(60),
    puser_id         VARCHAR(128),
    action_type      VARCHAR(64)  NOT NULL,
    target_resource  VARCHAR(128),
    target_puid      VARCHAR(60),
    client_ip        VARCHAR(64),
    detail_message   VARCHAR(1000)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
    ON public.local_audit_log (user_puid, event_time DESC);

-- 3. 平台手工修改行登记表（大批量迁移时保护本地修改，定案：行级主键登记 + 整行覆盖）
CREATE TABLE IF NOT EXISTS public.local_modified_rows (
    table_name       VARCHAR(64) NOT NULL,
    record_puid      VARCHAR(60) NOT NULL,
    updated_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (table_name, record_puid)
);

-- 4. 从已迁移的 ppom_user 初始化账号（幂等，可重复执行）
INSERT INTO public.local_user_auth
    (user_puid, puser_id, password_hash, role_code, is_enabled, updated_at)
SELECT u.puid,
       u.puser_id,
       u.pnewpassword,
       CASE WHEN u.puser_id = 'infodba' THEN 'ADMIN' ELSE 'ENGINEER' END,
       CASE WHEN u.pstatus = 0 THEN TRUE ELSE FALSE END,
       CURRENT_TIMESTAMP
FROM public.ppom_user u
WHERE u.pnewpassword IS NOT NULL
ON CONFLICT (user_puid) DO UPDATE
SET puser_id      = EXCLUDED.puser_id,
    password_hash = EXCLUDED.password_hash,
    is_enabled    = EXCLUDED.is_enabled,
    updated_at    = CURRENT_TIMESTAMP;
