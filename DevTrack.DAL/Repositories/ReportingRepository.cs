// ReportingRepository.cs

namespace DevTrack.DAL.Repositories
{
    public class ReportingRepository : BaseRepository
    {
        public ReportingRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        // Example: Get a report of project progress
        public async Task<List<ProjectProgressReport>> GetProjectProgressReportAsync()
        {
            var reports = new List<ProjectProgressReport>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    // Construct your SQL query for the report
                    string query = @"
                        SELECT p.ProjectName, p.ProjectStage, COUNT(t.TaskID) AS TotalTasks, 
                               SUM(CASE WHEN t.Status = 'Completed' THEN 1 ELSE 0 END) AS CompletedTasks
                        FROM projects p
                        LEFT JOIN tasks t ON p.ProjectID = t.ProjectID
                        GROUP BY p.ProjectID, p.ProjectName, p.ProjectStage";

                    using var command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        reports.Add(new ProjectProgressReport
                        {
                            ProjectName = reader.GetString("ProjectName"),
                            ProjectStage = reader.GetString("ProjectStage"),
                            TotalTasks = reader.GetInt32("TotalTasks"),
                            CompletedTasks = reader.GetInt32("CompletedTasks")
                        });
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error generating project progress report: {ex.Message}");
                return new List<ProjectProgressReport>();
            }

            return reports;
        }

        // ... (Add other methods for different reports) ...
    }
}