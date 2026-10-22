-- Up Migration
-- Intégrité de la hiérarchie des managers (AUD-006, AUD-021).
-- Les contraintes sont créées NOT VALID : elles s'appliquent à toute nouvelle
-- écriture, quel que soit le chemin (API, seed, SQL direct), sans bloquer la
-- migration ni modifier des relations historiques éventuellement incohérentes.
-- VALIDATE CONSTRAINT reste à lancer séparément, après examen de ces données.
-- Les boucles ne peuvent pas s'exprimer en contrainte : elles sont refusées
-- par la route d'affectation, sous verrou de la ligne companies.

ALTER TABLE users
  ADD CONSTRAINT users_id_company_unique UNIQUE (id, company_id);

-- Un manager appartient à la même entreprise que son collaborateur.
-- manager_id NULL (manager racine) n'est pas contrôlé.
ALTER TABLE users
  ADD CONSTRAINT users_manager_meme_entreprise_fk
  FOREIGN KEY (manager_id, company_id) REFERENCES users (id, company_id) NOT VALID;

-- Pas d'auto-affectation.
ALTER TABLE users
  ADD CONSTRAINT users_manager_distinct_check CHECK (manager_id IS DISTINCT FROM id) NOT VALID;

-- Down Migration
ALTER TABLE users DROP CONSTRAINT users_manager_distinct_check;
ALTER TABLE users DROP CONSTRAINT users_manager_meme_entreprise_fk;
ALTER TABLE users DROP CONSTRAINT users_id_company_unique;
