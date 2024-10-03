// ProjectHistoryRepository.cs

namespace DevTrack.DAL.Repositories
{
    public class ProjectHistoryRepository : BaseRepository
    {
        private readonly ProjectHistoryMapper projectHistoryMapper = new ProjectHistoryMapper();

        public ProjectHistoryRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<ProjectHistory>> GetAllProjectHistoriesAsync()
        {
            var projectHistories = new List<ProjectHistory>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM project_histories"; // Assuming you have a 'project_histories' table
                    using var command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        projectHistories.Add(projectHistoryMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all project histories: {ex.Message}");
                return new List<ProjectHistory>();
            }

            return projectHistories;
        }

        // ... (Implement other CRUD methods: CreateProjectHistoryAsync, UpdateProjectHistoryAsync, DeleteProjectHistoryAsync) ...
    }
}