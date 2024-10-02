using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DevTrack.Repositories
{
    public class UserRepository : BaseRepository
    {
        private readonly UserMapper userMapper = new UserMapper();

        public UserRepository(IDbConnectionFactory connectionFactory) : base(connectionFactory)
        {
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            var users = new List<User>();

            try
            {
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "SELECT * FROM users";
                    using var command = new MySqlCommand(query, connection);

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
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "INSERT INTO users (UserName, Email, Role, Department) " +
                                   "VALUES (@UserName, @Email, @Role, @Department)";
                    using var command = new MySqlCommand(query, connection);
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
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "UPDATE users SET UserName = @UserName, Email = @Email, Role = @Role, Department = @Department " +
                                   "WHERE UserID = @UserID";
                    using var command = new MySqlCommand(query, connection);
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
                using (var connection = connectionFactory.CreateConnection())
                {
                    string query = "DELETE FROM users WHERE UserID = @UserID";
                    using var command = new MySqlCommand(query, connection);
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