using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Configuration;

namespace DevTrack.Repositories
{
    public class MilestoneRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["DevTrackConnection"].ConnectionString;

        public List<Milestone> GetAllMilestones()
        {
            var milestones = new List<Milestone>();

            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "SELECT * FROM milestones";
                    using var command = new MySqlCommand(query, connection);

                    connection.Open();
                    using var reader = command.ExecuteReader();

                    while (reader.Read())
                    {
                        milestones.Add(new Milestone(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all milestones: {ex.Message}");
                return new List<Milestone>();
            }

            return milestones;
        }

        public void CreateMilestone(Milestone milestone)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "INSERT INTO milestones (ProjectID, MilestoneName, Description, TargetDate, Status, CompletedDate) " +
                                   "VALUES (@ProjectID, @MilestoneName, @Description, @TargetDate, @Status, @CompletedDate)";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", milestone.ProjectID);
                    command.Parameters.AddWithValue("@MilestoneName", milestone.MilestoneName);
                    command.Parameters.AddWithValue("@Description", milestone.Description);
                    command.Parameters.AddWithValue("@TargetDate", milestone.TargetDate);
                    command.Parameters.AddWithValue("@Status", milestone.Status);
                    command.Parameters.AddWithValue("@CompletedDate", milestone.CompletedDate);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating milestone: {ex.Message}");
                throw;
            }
        }

        public void UpdateMilestone(Milestone milestone)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "UPDATE milestones SET ProjectID = @ProjectID, MilestoneName = @MilestoneName, Description = @Description, " +
                                   "TargetDate = @TargetDate, Status = @Status, CompletedDate = @CompletedDate " +
                                   "WHERE MilestoneID = @MilestoneID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", milestone.ProjectID);
                    command.Parameters.AddWithValue("@MilestoneName", milestone.MilestoneName);
                    command.Parameters.AddWithValue("@Description", milestone.Description);
                    command.Parameters.AddWithValue("@TargetDate", milestone.TargetDate);
                    command.Parameters.AddWithValue("@Status", milestone.Status);
                    command.Parameters.AddWithValue("@CompletedDate", milestone.CompletedDate);
                    command.Parameters.AddWithValue("@MilestoneID", milestone.MilestoneID);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating milestone: {ex.Message}");
                throw;
            }
        }

        public void DeleteMilestone(int milestoneId)
        {
            try
            {
                using (var connection = new MySqlConnection(connectionString))
                {
                    string query = "DELETE FROM milestones WHERE MilestoneID = @MilestoneID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@MilestoneID", milestoneId);

                    connection.Open();
                    command.ExecuteNonQuery();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error deleting milestone: {ex.Message}");
                throw;
            }
        }
    }
}