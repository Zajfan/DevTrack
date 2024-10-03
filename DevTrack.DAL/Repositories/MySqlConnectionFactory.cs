// MySqlConnectionFactory.cs
using MySql.Data.MySqlClient;

namespace DevTrack.DAL.Repositories
{
    public class MySqlConnectionFactory : IDbConnectionFactory
    {
        private readonly string connectionString;

        public MySqlConnectionFactory(string
 connectionString)
        {
            this.connectionString = connectionString;
        }

        public
 MySqlConnection CreateConnection()
        {
            return new MySqlConnection(connectionString);
        }
    }
}