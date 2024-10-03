// TaskDependencyRepository.cs
namespace DevTrack.DAL.Repositories
{
    public class TaskDependencyRepository : BaseRepository
    {
        private readonly TaskDependencyMapper taskDependencyMapper = new TaskDependencyMapper();

        public TaskDependencyRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<TaskDependency>> GetAllTaskDependenciesAsync()
        {
            var dependencies = new List<TaskDependency>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM task_dependencies";
                    using var command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        dependencies.Add(taskDependencyMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all task dependencies: {ex.Message}");
                return new List<TaskDependency>();
            }

            return dependencies;
        }

        public async Task CreateTaskDependencyAsync(TaskDependency dependency)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "INSERT INTO task_dependencies (TaskID, DependsOnTaskID) " +
                                   "VALUES (@TaskID, @DependsOnTaskID)";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@TaskID", dependency.TaskID);
                    command.Parameters.AddWithValue("@DependsOnTaskID", dependency.DependsOnTaskID);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating task dependency: {ex.Message}");
                throw;
            }
        }

        public async Task UpdateTaskDependencyAsync(TaskDependency dependency)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "UPDATE task_dependencies SET TaskID = @TaskID, DependsOnTaskID = @DependsOnTaskID " +
                                   "WHERE DependencyID = @DependencyID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@TaskID", dependency.TaskID);
                    command.Parameters.AddWithValue("@DependsOnTaskID", dependency.DependsOnTaskID);
                    command.Parameters.AddWithValue("@DependencyID", dependency.DependencyID);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating task dependency: {ex.Message}");
                throw;
            }
        }

        public async Task DeleteTaskDependencyAsync(int dependencyId)
        {
            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM task_dependencies WHERE DependencyID = @DependencyID";
                    using var command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@DependencyID", dependencyId);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error deleting task dependency: {ex.Message}");
                throw;
            }
        }
    }
}