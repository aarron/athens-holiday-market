CREATE INDEX "applications_cycle_status_idx" ON "applications" USING btree ("cycle_id","status");--> statement-breakpoint
CREATE INDEX "applications_decision_resend_idx" ON "applications" USING btree ("decision_resend_id");--> statement-breakpoint
CREATE INDEX "applications_paypal_invoice_idx" ON "applications" USING btree ("paypal_invoice_id");--> statement-breakpoint
CREATE INDEX "applications_lower_email_idx" ON "applications" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "artists_published_idx" ON "artists" USING btree ("published");--> statement-breakpoint
CREATE INDEX "artists_application_idx" ON "artists" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "broadcast_recipients_lower_email_idx" ON "broadcast_recipients" USING btree (lower("email"));