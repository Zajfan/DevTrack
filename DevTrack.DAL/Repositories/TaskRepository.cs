// TaskRepository.cs
namespace DevTrack.DAL.Repositories
{
    public class TaskRepository : BaseRepository
    {
        private readonly TaskMapper taskMapper = new TaskMapper();

        public TaskRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<Task>> GetAllTasksAsync()
        {
            var tasks = new List<Task>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM tasks";
                    using var command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        tasks.Add(taskMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all tasks: {ex.Message}");
                return new List<Task>();
            }

            return tasks;
        }

        public async Task<List<Task>> GetTasksByProjectIdAsync(int projectId)
        {
            var tasks = new List<Task>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM tasks WHERE ProjectID = @ProjectID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@ProjectID", projectId);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        tasks.Add(taskMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting tasks by project ID: {ex.Message}");
                return new List<Task>();
            }

            return tasks;
        }

        // ... (Implement other CRUD methods: CreateTaskAsync, UpdateTaskAsync, DeleteTaskAsync) ...
    }
}