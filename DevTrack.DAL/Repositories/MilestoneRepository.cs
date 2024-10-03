// MilestoneRepository.cs
namespace DevTrack.DAL.Repositories
{
    public class MilestoneRepository : BaseRepository
    {
        private readonly MilestoneMapper milestoneMapper = new MilestoneMapper();

        public MilestoneRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        // ... (GetAllMilestonesAsync method) ...

        public async Task CreateMilestoneAsync(Milestone milestone)
        {
            try
            {
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "INSERT INTO milestones (ProjectID, MilestoneName, Description, TargetDate, Status, CompletedDate) " +
                                   "VALUES (@ProjectID, @MilestoneName, @Description, @TargetDate, @Status, @CompletedDate)";
                    using MySqlCommand command = new(query, connection);
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
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "UPDATE milestones SET ProjectID = @ProjectID, MilestoneName = @MilestoneName, Description = @Description, " +
                                   "TargetDate = @TargetDate, Status = @Status, CompletedDate = @CompletedDate " +
                                   "WHERE MilestoneID = @MilestoneID";
                    using MySqlCommand command = new(query, connection);
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
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM milestones WHERE MilestoneID = @MilestoneID";
                    using MySqlCommand command = new(query, connection);
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