-- 우리지금만나 — RLS · pg_cron (003)
-- 002_functions_triggers.sql 적용 후 실행

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommender_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_point_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_host_transfer_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_activity_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_schedule_day_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_schedule_week_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_schedule_week_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_schedule_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_member_departure ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_recommendation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_travel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_votes ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Profiles selectable by authenticated" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Recommender titles are public" ON recommender_titles FOR SELECT USING (true);
CREATE POLICY "Social titles are public" ON social_point_titles FOR SELECT USING (true);

-- rooms
CREATE POLICY "Room members can view rooms" ON rooms FOR SELECT
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = rooms.id AND user_id = auth.uid()));
CREATE POLICY "Authenticated users can create rooms" ON rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Room owners can update rooms" ON rooms FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM room_members WHERE room_id = rooms.id AND user_id = auth.uid() AND role = 'OWNER'
  ));

-- room_members
CREATE POLICY "Members can view room membership" ON room_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid()
  ));
CREATE POLICY "Members can join rooms" ON room_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update member roles" ON room_members FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid() AND rm.role = 'OWNER'
  ));
CREATE POLICY "Owners can remove members" ON room_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid() AND rm.role = 'OWNER'
  ));

-- room_invitations
CREATE POLICY "Invitee can view own invitations" ON room_invitations FOR SELECT TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid());
CREATE POLICY "Room owners can create invitations" ON room_invitations FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid() AND EXISTS (
    SELECT 1 FROM room_members WHERE room_id = room_invitations.room_id AND user_id = auth.uid() AND role = 'OWNER'
  ));
CREATE POLICY "Invitee can respond to invitations" ON room_invitations FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid());

-- room_invite_links
CREATE POLICY "Room members view invite links" ON room_invite_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = room_invite_links.room_id AND user_id = auth.uid()));
CREATE POLICY "Room owners manage invite links" ON room_invite_links FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM room_members WHERE room_id = room_invite_links.room_id AND user_id = auth.uid() AND role = 'OWNER'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM room_members WHERE room_id = room_invite_links.room_id AND user_id = auth.uid() AND role = 'OWNER'
  ));

-- room_host_transfer_pending
CREATE POLICY "Members view host transfer pending" ON room_host_transfer_pending FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = room_host_transfer_pending.room_id AND user_id = auth.uid()));
CREATE POLICY "Owner requests host transfer" ON room_host_transfer_pending FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM room_members WHERE room_id = room_host_transfer_pending.room_id AND user_id = auth.uid() AND role = 'OWNER'
  ));
CREATE POLICY "Owner or target deletes host transfer" ON room_host_transfer_pending FOR DELETE TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- room_activity_days
CREATE POLICY "Room members can view room activity" ON room_activity_days FOR SELECT
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = room_activity_days.room_id AND user_id = auth.uid()));

-- friendships
CREATE POLICY "Friends view own graph" ON friendships FOR SELECT TO authenticated USING (user_id = auth.uid());

-- team schedule
CREATE POLICY "Team schedule memos for members" ON team_schedule_day_memos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = team_schedule_day_memos.room_id AND user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM room_members WHERE room_id = team_schedule_day_memos.room_id AND user_id = auth.uid()
  ));
CREATE POLICY "Team schedule week slots for members" ON team_schedule_week_availability FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = team_schedule_week_availability.room_id AND user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM room_members WHERE room_id = team_schedule_week_availability.room_id AND user_id = auth.uid()
  ));
CREATE POLICY "Team schedule week notes for members" ON team_schedule_week_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = team_schedule_week_notes.room_id AND user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM room_members WHERE room_id = team_schedule_week_notes.room_id AND user_id = auth.uid()
  ));
CREATE POLICY "Team schedule milestones for members" ON team_schedule_milestones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = team_schedule_milestones.room_id AND user_id = auth.uid()));
CREATE POLICY "Team schedule milestones update for members" ON team_schedule_milestones FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = team_schedule_milestones.room_id AND user_id = auth.uid()));

-- appointments
CREATE POLICY "Room members view appointments" ON appointments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = appointments.room_id AND user_id = auth.uid()));
CREATE POLICY "Room members create appointments" ON appointments FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM room_members WHERE room_id = appointments.room_id AND user_id = auth.uid()
  ));
CREATE POLICY "Room members update appointments" ON appointments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_id = appointments.room_id AND user_id = auth.uid()));

CREATE POLICY "Members manage own date votes" ON date_votes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM appointments a JOIN room_members rm ON rm.room_id = a.room_id
    WHERE a.id = date_votes.appointment_id AND rm.user_id = auth.uid()
  ));
CREATE POLICY "Members view date votes in room" ON date_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM appointments a JOIN room_members rm ON rm.room_id = a.room_id
    WHERE a.id = date_votes.appointment_id AND rm.user_id = auth.uid()
  ));

CREATE POLICY "Members manage own time votes" ON time_votes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM appointments a JOIN room_members rm ON rm.room_id = a.room_id
    WHERE a.id = time_votes.appointment_id AND rm.user_id = auth.uid()
  ));
CREATE POLICY "Members view time votes in room" ON time_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM appointments a JOIN room_members rm ON rm.room_id = a.room_id
    WHERE a.id = time_votes.appointment_id AND rm.user_id = auth.uid()
  ));

CREATE POLICY "Members view attendance" ON appointment_attendance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM appointments a JOIN room_members rm ON rm.room_id = a.room_id
    WHERE a.id = appointment_attendance.appointment_id AND rm.user_id = auth.uid()
  ));
CREATE POLICY "Users manage own attendance" ON appointment_attendance FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Room members view appointment comments" ON appointment_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM appointments a JOIN room_members rm ON rm.room_id = a.room_id
    WHERE a.id = appointment_comments.appointment_id AND rm.user_id = auth.uid()
  ));
CREATE POLICY "Room members post appointment comments" ON appointment_comments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM appointments a JOIN room_members rm ON rm.room_id = a.room_id
    WHERE a.id = appointment_comments.appointment_id AND rm.user_id = auth.uid()
  ));
CREATE POLICY "Authors delete own comments" ON appointment_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members view departure status" ON appointment_member_departure FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM appointments a JOIN room_members rm ON rm.room_id = a.room_id
    WHERE a.id = appointment_member_departure.appointment_id AND rm.user_id = auth.uid()
  ));
CREATE POLICY "Members update own departure status" ON appointment_member_departure FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- places
CREATE POLICY "Authenticated users view places" ON places FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users create places" ON places FOR INSERT TO authenticated
  WITH CHECK (recommended_by = auth.uid());

CREATE POLICY "Users manage own place ratings" ON place_ratings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone view place ratings" ON place_ratings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own recommendation votes" ON place_recommendation_votes FOR ALL TO authenticated
  USING (voter_id = auth.uid()) WITH CHECK (voter_id = auth.uid());
CREATE POLICY "Anyone view recommendation votes" ON place_recommendation_votes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own travel logs" ON user_travel_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- room_votes
CREATE POLICY "Members can view own room votes" ON room_votes FOR SELECT
  USING (voter_id = auth.uid() OR target_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM room_members WHERE room_id = room_votes.room_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can insert praise votes" ON room_votes FOR INSERT
  WITH CHECK (voter_id = auth.uid() AND EXISTS (
    SELECT 1 FROM room_members WHERE room_id = room_votes.room_id AND user_id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM room_members WHERE room_id = room_votes.room_id AND user_id = room_votes.target_user_id
  ));

-- ============================================================
-- pg_cron (Extensions → pg_cron ON 후 Dashboard에서 실행)
-- ============================================================
-- SELECT cron.schedule('delete-expired-rooms-job', '* * * * *', $$SELECT public.delete_expired_rooms();$$);
-- SELECT cron.schedule('delete-inactive-fixed-rooms-job', '0 3 * * *', $$SELECT public.delete_inactive_fixed_rooms();$$);
