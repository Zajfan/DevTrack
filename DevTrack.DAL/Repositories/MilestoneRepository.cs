// MilestoneRepository.cs
using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DevTrack.DAL.Repositories
{
    public class MilestoneRepository : BaseRepository
    {
        private readonly MilestoneMapper milestoneMapper = new MilestoneMapper();

        public MilestoneRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<Milestone>> GetAllMilestonesAsync()
        {
            var milestones = new List<Milestone>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM milestones";
                    using var command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        milestones.Add(milestoneMapper.MapFromReader(reader));
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

        public async Task CreateMilestoneAsync(Milestone milestone)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
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

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating milestone: {ex.Message}");
                throw;
            }
        }

        public async Task UpdateMilestoneAsync(Milestone milestone)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
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

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating milestone: {ex.Message}");
                throw;
            }
        }

        public async Task DeleteMilestoneAsync(int milestoneId)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM milestones WHERE MilestoneID = @MilestoneID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@MilestoneID", milestoneId);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
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