// MySqlConnectionFactory.cs

namespace DevTrack.DAL.Repositories
{
    public class MySqlConnection
    {
        public MySqlConnection(string connectionString)
        {
        }

        internal async Task OpenAsync()
        {
            throw new NotImplementedException();
        }
    }
}