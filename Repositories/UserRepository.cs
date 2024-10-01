// UserRepository.cs
using DevTrack.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Configuration;

namespace DevTrack.Repositories
{
    public class UserRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["DevTrackConnection"].ConnectionString;

        public List<User> GetAllUsers()
        {
            // ... (Implement GetAllUsers with try-catch and empty list handling) ...
        }

        public void CreateUser(User user)
        {
            // ... (Implement CreateUser with parameterization and try-catch) ...
        }

        public void UpdateUser(User user)
        {
            // ... (Implement UpdateUser with parameterization and try-catch) ...
        }

        public void DeleteUser(int userId)
        {
            // ... (Implement DeleteUser with parameterization and try-catch) ...
        }
    }
}