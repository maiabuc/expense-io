-- Up Migration
-- Le montant saisi avant arrondi est nécessaire à une reprise après perte du stockage navigateur.
ALTER TABLE expense_notes ADD COLUMN request_amount text;
REVOKE INSERT ON expense_notes FROM expense_app;
GRANT INSERT (user_id, amount, expense_date, description, receipt_key, status,
  request_key, request_fingerprint, receipt_sha256, receipt_size, request_amount) ON expense_notes TO expense_app;

-- Le rôle partagé peut décider une note ou finaliser la sienne, jamais substituer
-- le reçu d'une note déjà réservée (notamment pendant une décision manager/RH).
CREATE FUNCTION proteger_recu_soumission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname=current_user)
     AND pg_has_role(current_user, 'expense_app', 'member') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.receipt_key <> '' THEN
        RAISE EXCEPTION 'Référence initiale du reçu interdite' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;
    IF NEW.receipt_key IS DISTINCT FROM OLD.receipt_key THEN
      IF OLD.status <> 'incomplete' OR OLD.receipt_key <> ''
         OR NEW.receipt_key !~ ('^receipts/' || OLD.receipt_seq::text || '\.(png|jpg|webp|pdf)$') THEN
        RAISE EXCEPTION 'Modification de la référence du reçu interdite' USING ERRCODE = '42501';
      END IF;
    END IF;
    IF OLD.status <> 'incomplete' AND
       (NEW.claim_token IS DISTINCT FROM OLD.claim_token OR NEW.claim_expires_at IS DISTINCT FROM OLD.claim_expires_at) THEN
      RAISE EXCEPTION 'Modification de réservation interdite' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'pending' AND NEW.receipt_key = '' THEN
      RAISE EXCEPTION 'Référence du reçu requise' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER proteger_recu_soumission BEFORE INSERT OR UPDATE ON expense_notes
FOR EACH ROW EXECUTE FUNCTION proteger_recu_soumission();

-- Down Migration
GRANT INSERT ON expense_notes TO expense_app;
DROP TRIGGER proteger_recu_soumission ON expense_notes;
DROP FUNCTION proteger_recu_soumission();
ALTER TABLE expense_notes DROP COLUMN request_amount;
