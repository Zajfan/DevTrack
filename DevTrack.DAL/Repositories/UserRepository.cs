// UserRepository.cs
namespace DevTrack.DAL.Repositories
{
    public class UserRepository : BaseRepository
    {
        private readonly UserMapper userMapper = new UserMapper();

        public UserRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            List<User> users = new List<User>();

            try
            {
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM users";
                    using MySqlCommand command = new MySqlCommand(query, connection);

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        users.Add(userMapper.MapFromReader(reader));
                    }
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error getting all users: {ex.Message}");
                return new List<User>();
            }

            return users;
        }

        public async Task CreateUserAsync(User user)
        {
            try
            {
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "INSERT INTO users (UserName, Email, Role, Department) " +
                                   "VALUES (@UserName, @Email, @Role, @Department)";
                    using MySqlCommand command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@UserName", user.UserName);
                    command.Parameters.AddWithValue("@Email", user.Email);
                    command.Parameters.AddWithValue("@Role", user.Role);
                    command.Parameters.AddWithValue("@Department", user.Department);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error creating user: {ex.Message}");
                throw;
            }
        }

        public async Task UpdateUserAsync(User user)
        {
            try
            {
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "UPDATE users SET UserName = @UserName, Email = @Email, Role = @Role, Department = @Department " +
                                   "WHERE UserID = @UserID";
                    using MySqlCommand command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@UserName", user.UserName);
                    command.Parameters.AddWithValue("@Email", user.Email);
                    command.Parameters.AddWithValue("@Role", user.Role);
                    command.Parameters.AddWithValue("@Department", user.Department);
                    command.Parameters.AddWithValue("@UserID", user.UserID);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error updating user: {ex.Message}");
                throw;
            }
        }

        public async Task DeleteUserAsync(int userId)
        {
            try
            {
                using (MySql.Data.MySqlClient.MySqlConnection connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM users WHERE UserID = @UserID";
                    using MySqlCommand command = new MySqlCommand(query, connection);
                    command.Parameters.AddWithValue("@UserID", userId);

                    await connection.OpenAsync();
                    await command.ExecuteNonQueryAsync();
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Error deleting user: {ex.Message}");
                throw;
            }
        }
    }
}