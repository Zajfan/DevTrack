using MySql.Data.MySqlClient;

namespace DevTrack.Repositories
{
    public interface IDbConnectionFactory
    {
        MySqlConnection CreateConnection();
    }
}