-- Up Migration
-- Soumission récupérable (AUD-003) et isolation effective (AUD-009).

-- 1. État « incomplete » : soumission réservée, reçu pas encore confirmé.
ALTER TABLE expense_notes DROP CONSTRAINT expense_notes_status_check;
ALTER TABLE expense_notes
  ADD CONSTRAINT expense_notes_status_check
  CHECK (status IN ('incomplete', 'pending', 'approved', 'rejected'));

-- 2. Demande stable : clé liée durablement à l'utilisateur et à la note, empreinte
--    du contenu et du reçu, réservation d'exécution (jeton + expiration).
--    Les notes antérieures gardent des valeurs NULL.
ALTER TABLE expense_notes
  ADD COLUMN request_key uuid,
  ADD COLUMN request_fingerprint text,
  ADD COLUMN receipt_sha256 text,
  ADD COLUMN receipt_size integer,
  ADD COLUMN claim_token uuid,
  ADD COLUMN claim_expires_at timestamptz;

ALTER TABLE expense_notes
  ADD CONSTRAINT expense_notes_request_unique UNIQUE (user_id, request_key);

-- 3. Politiques RLS : même entreprise, rôle actuel et relation pour manager et RH ;
--    une politique par action, sans politique permissive parallèle.
--    L'utilisateur courant est posé par withUserScope (app.current_user_id).
DROP POLICY expense_notes_owner_insert ON expense_notes;
DROP POLICY expense_notes_manager_select ON expense_notes;
DROP POLICY expense_notes_manager_update ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_select ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_update ON expense_notes;

-- Le propriétaire ne crée que des soumissions incomplètes.
CREATE POLICY expense_notes_owner_insert ON expense_notes
  FOR INSERT
  WITH CHECK (
    user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
    AND status = 'incomplete'
  );

-- Finalisation bornée : seulement sa propre note incomplète, vers incomplete ou
-- pending. Aucune auto-approbation ; les colonnes modifiables sont limitées par
-- les privilèges du compte applicatif (voir plus bas).
CREATE POLICY expense_notes_owner_finalize ON expense_notes
  FOR UPDATE
  USING (
    user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
    AND status = 'incomplete'
  )
  WITH CHECK (
    user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
    AND status IN ('incomplete', 'pending')
  );

CREATE POLICY expense_notes_manager_select ON expense_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u, users m
      WHERE u.id = expense_notes.user_id
        AND m.id = nullif(current_setting('app.current_user_id', true), '')::uuid
        AND m.role = 'manager'
        AND u.manager_id = m.id
        AND u.company_id = m.company_id
    )
  );

CREATE POLICY expense_notes_manager_update ON expense_notes
  FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM users u, users m
      WHERE u.id = expense_notes.user_id
        AND m.id = nullif(current_setting('app.current_user_id', true), '')::uuid
        AND m.role = 'manager'
        AND u.manager_id = m.id
        AND u.company_id = m.company_id
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND EXISTS (
      SELECT 1 FROM users u, users m
      WHERE u.id = expense_notes.user_id
        AND m.id = nullif(current_setting('app.current_user_id', true), '')::uuid
        AND m.role = 'manager'
        AND u.manager_id = m.id
        AND u.company_id = m.company_id
    )
  );

CREATE POLICY expense_notes_hr_root_manager_select ON expense_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u, users hr
      WHERE u.id = expense_notes.user_id
        AND hr.id = nullif(current_setting('app.current_user_id', true), '')::uuid
        AND hr.role = 'hr_admin'
        AND u.role = 'manager'
        AND u.manager_id IS NULL
        AND u.company_id = hr.company_id
    )
  );

CREATE POLICY expense_notes_hr_root_manager_update ON expense_notes
  FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM users u, users hr
      WHERE u.id = expense_notes.user_id
        AND hr.id = nullif(current_setting('app.current_user_id', true), '')::uuid
        AND hr.role = 'hr_admin'
        AND u.role = 'manager'
        AND u.manager_id IS NULL
        AND u.company_id = hr.company_id
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND EXISTS (
      SELECT 1 FROM users u, users hr
      WHERE u.id = expense_notes.user_id
        AND hr.id = nullif(current_setting('app.current_user_id', true), '')::uuid
        AND hr.role = 'hr_admin'
        AND u.role = 'manager'
        AND u.manager_id IS NULL
        AND u.company_id = hr.company_id
    )
  );

-- 4. Compte applicatif limité. Rôle de groupe sans connexion : l'exploitant crée un
--    rôle LOGIN membre de expense_app (mot de passe hors dépôt) et l'utilise comme
--    DATABASE_URL de l'application. Migrations, seed et fixtures gardent le compte
--    de préparation (propriétaire des tables). Ce rôle n'est ni superutilisateur ni
--    BYPASSRLS et ne peut modifier aucune colonne d'identité ou de montant d'une note.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'expense_app') THEN
    CREATE ROLE expense_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO expense_app;
GRANT SELECT, INSERT ON companies TO expense_app;
-- Le verrou SELECT ... FOR UPDATE sur companies (affectations) exige un privilège UPDATE.
GRANT UPDATE (name) ON companies TO expense_app;
GRANT SELECT, INSERT ON users TO expense_app;
GRANT UPDATE (manager_id) ON users TO expense_app;
GRANT SELECT, INSERT ON expense_notes TO expense_app;
GRANT UPDATE (receipt_key, status, claim_token, claim_expires_at) ON expense_notes TO expense_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO expense_app;

-- Down Migration
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM expense_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM expense_app;
REVOKE USAGE ON SCHEMA public FROM expense_app;
DROP POLICY expense_notes_hr_root_manager_update ON expense_notes;
DROP POLICY expense_notes_hr_root_manager_select ON expense_notes;
DROP POLICY expense_notes_manager_update ON expense_notes;
DROP POLICY expense_notes_manager_select ON expense_notes;
DROP POLICY expense_notes_owner_finalize ON expense_notes;
DROP POLICY expense_notes_owner_insert ON expense_notes;
CREATE POLICY expense_notes_owner_insert ON expense_notes
  FOR INSERT
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
CREATE POLICY expense_notes_manager_select ON expense_notes
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id
    AND u.manager_id = nullif(current_setting('app.current_user_id', true), '')::uuid));
CREATE POLICY expense_notes_manager_update ON expense_notes
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id
    AND u.manager_id = nullif(current_setting('app.current_user_id', true), '')::uuid));
CREATE POLICY expense_notes_hr_root_manager_select ON expense_notes
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.role = 'manager' AND u.manager_id IS NULL)
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = nullif(current_setting('app.current_user_id', true), '')::uuid AND hr.role = 'hr_admin'));
CREATE POLICY expense_notes_hr_root_manager_update ON expense_notes
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = expense_notes.user_id AND u.role = 'manager' AND u.manager_id IS NULL)
    AND EXISTS (SELECT 1 FROM users hr WHERE hr.id = nullif(current_setting('app.current_user_id', true), '')::uuid AND hr.role = 'hr_admin'));
ALTER TABLE expense_notes
  DROP CONSTRAINT expense_notes_request_unique,
  DROP COLUMN claim_expires_at, DROP COLUMN claim_token, DROP COLUMN receipt_size,
  DROP COLUMN receipt_sha256, DROP COLUMN request_fingerprint, DROP COLUMN request_key;
ALTER TABLE expense_notes DROP CONSTRAINT expense_notes_status_check;
ALTER TABLE expense_notes ADD CONSTRAINT expense_notes_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
